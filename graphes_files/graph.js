// GRAPH JS ======================================================================================================

// Récupération de données sur le canvas -------------------------------------------------------------------------

/*
 *  Retrouve un élément du graphe à partir des coordonnées en argument
 */
function getElement(x, y){
    var el, r

    // Un noeud ?
    for (var i = graph.vertices.length - 1; i >= 0; i--) {
        el = graph.vertices[i]
        r  = el.style.vertexradius * (touch ? 3 : 1.5)
        if(Math.abs(x - el.x) <= r && Math.abs(y - el.y) <= r) {
            return el
        }
    }
    
    // Une arête ? Approche selon les courbes de Bezier
    // Tolerance = distance max à la souris
    var tol = 5 
    var pitch = 5
    var edgegroups = graph.edgeGroups()
    
    for (var s in edgegroups) {
        var group = edgegroups[s]

        for (var i in group) {
            var edge = group[i]
            var params = computeCurveParameters(group.length, i, edge);
            
            // Quadratic curve Q(t) = (1-t)^2 a + 2(1-t)t alpha + t^2 b
            // where t = 0..1. Compute each of the d points
            var n = 2 * params['lg_AB']

            // Take n/pitch steps of length h
            for (var j = 0; j < n; j += pitch) {
                // Find the corresponding value for t
                var t = j/n
                
                // Compute coordinates of Q(t) = [Qx,Qy]
                var Qx = (1-t)*(1-t) * params['ax'] + 2*(1-t)*t * params['alphax'] + t*t * params['bx']
                var Qy = (1-t)*(1-t) * params['ay'] + 2*(1-t)*t * params['alphay'] + t*t * params['by']
                
                distToMouse = Math.sqrt(Math.pow(Qy-y, 2) + Math.pow(Qx-x, 2))
                if (distToMouse < tol) {
                    return edge
                }
            }
        }
    }
    
    return null // None found
}


/*
 *  Extrait les coordonnées d'un évènement (clic par exemple)
 */
function evtPosition(evt, canvas) {
    var o = canvas.offset()

    // Abscisse
    var x = (!is_undefined(evt.clientX) ? evt.clientX : 
        (is_undefined(evt.offsetX) ? evt.x : evt.offsetX)
    ) - o.left;

    // Ordonnée (/!\ au scroll)
    var y = (!is_undefined(evt.clientY) ? evt.clientY : 
        (is_undefined(evt.offsetY) ? evt.y : evt.offsetY)
    ) - o.top + $(document).scrollTop();

    return [x,y]
}


// Canvas triggers -----------------------------------------------------------------------------------------------

/* 
 *  Modifie le canvas en temps réel à l'action "drag & drop" de l'utilisateur
 */
function canvasMove(evt){
    var [x,y] = evtPosition(evt, canvas_elt)
    var el
    
    if (dragging && uimode == GJ_TOOL_SELECT) {
        dlog("Drag")

        // Drag d'un nouvel élément ? --> hovered
        if(tmp_edge[0] == null){
            tmp_edge = [x,y]
            hovered = getElement(x,y)
        }

        if (hovered != null) {
            if (!inArray(hovered, selected))
                setSelected(hovered, evt)

            // Modifier la position de tous les sommets sélectionnés
            // selon le déplacement du sommet "draggué"
            for (var i = 0; i < selected.length; i++) {
                el = selected[i]

                if (el instanceof Vertex) {
                    // Set original vertex position
                    if(tmp_edge[0] == x && tmp_edge[1] == y){
                        el.ox = el.x
                        el.oy = el.y
                    }

                    // New coordinates (not too close to the edge)
                    el.x = Math.max(5, el.ox + (x - tmp_edge[0]))
                    el.y = Math.max(5, el.oy + (y - tmp_edge[1]))
                }
            }

            updateState()
        }
        else {
            var selection = graph.elementsWithinRect(tmp_edge[0], tmp_edge[1], x, y)

            if (!evt.shiftKey)
                selected = []

            for (var i in selection)
                selected[selection[i].id] = selection[i]

            drawAll()
            context.strokeStyle = "rgba(153,153,153,0.5)"
            context.lineWidth = 1
            context.strokeRect(tmp_edge[0], tmp_edge[1], x-tmp_edge[0], y-tmp_edge[1])
        }

        // Pour empecher l'evenement clic
        if (!touch)
            dontclick = true
    }
    else {
        if (uimode == GJ_TOOL_ADD_EDGE) {
            hovered = getElement(x,y)

            if (touch && hovered instanceof Vertex) {
                tmp_edge[(tmp_edge[0] == null) ? 0 : 1] = hovered
                selected = [hovered]
                finishAddEdge(context)
            }
        } else {
            tmp_edge = [null,null]
        }
    }
}


/*
 *  Fonction exécutée à l'évènement clic
 */
function canvasClick(evt){
    if(!dragging && !dontclick){
        var clicPos = evtPosition(evt, canvas_elt)
        var elmt = getElement(clicPos[0], clicPos[1])
        var shortcutShift    = (evt.altKey || evt.ctrlKey) && evt.shiftKey
        var shortcutNotShift = (evt.altKey || evt.ctrlKey) && !evt.shiftKey

        if (uimode == GJ_TOOL_SELECT) {
            dlog(["Clic", "Manipulation canvas"])
            setSelected(elmt, evt)
            updateState()
        }
        if(uimode == GJ_TOOL_SELECT && shortcutShift && elmt instanceof Vertex){
            dlog(["Clic", "Départ arête"])
            startAddEdge(context)
        }
        if(uimode == GJ_TOOL_ADD_EDGE && elmt instanceof Vertex){
            dlog(["Clic", "Création arête ..."])
            tmp_edge[(tmp_edge[0] == null) ? 0 : 1] = elmt

            selected = []
            selected[elmt.id] = elmt

            updateState(false)
            finishAddEdge(context)
        }
        if((uimode == GJ_TOOL_ADD_VERTEX || (uimode == GJ_TOOL_SELECT && shortcutNotShift)) && elmt == null){
            dlog(["Clic", "Nouveau noeud"])
            finishAddVertex(clicPos[0], clicPos[1], context)
        }
    }

    if (dontclick)
        dontclick = false
}


/*
 *  Fonction exécutée à l'evenement key (touche clavier)
 */
function canvasKey(evt){
    if (evt.target.tagName == "HTML") {
        var key  = evt.keyCode || evt.which
        var s

        // 37 (left), 38 (up), 39 (right), 40 (down)
        if (inArray(key, [37,38,39,40]) && (selected.length > 0 && selected[0] != null)) {
            evt.preventDefault()
            var inc = inArray(key, [38,39]) 
            var x   = inArray(key, [37,39])

            for (var i in selected) {
                s = selected[i]
                if(s.x && s.y && !isNaN(s.x) && !isNaN(s.y)){
                    if(x){
                        s.x = inc ? s.x + 1 : s.x - 1
                    } else {
                        s.y = inc ? s.y + 1 : s.y - 1
                    }
                }
            }

            drawAll()
            fillInfobox(selected)
        }
    }
}

// Méthodes d'actions sur l'application --------------------------------------------------------------------------

/*
 *  Trigger enclenché au clic du bouton "Ajout d'une arête"
 */
function startAddEdge(){
    var msg = $(htmlMessages.nvlArete)
    $(" #info ").empty().append(msg)
    
    // Activation du bouton d'annulation de création
    $("#cancelEdge", msg).click(function(){ 
        setUimode(GJ_TOOL_SELECT); 
        tmp_edge = [null,null];
        updateState();
    })

    selected = [null]
    tmp_edge = [null,null]
    updateState(false)
    setUimode(GJ_TOOL_ADD_EDGE)
}


/*
 *  Trigger enclenché au clic du bouton "Ajout d'un noeud"
 */
function startAddVertex(){
    var msg = $(htmlMessages.nvNoeud)
    $(" #info ").empty().append(msg)

    // Activation du bouton d'annulation de création
    $("#cancelVertex", msg).click( function(){ 
        setUimode(GJ_TOOL_SELECT); 
        updateState(); 
    })

    selected = [null]
    tmp_edge = [null,null]
    updateState(false)
    setUimode(GJ_TOOL_ADD_VERTEX)
}


/*
 *  Méthode appelée par canvasClick après avoir sélectionné le noeud d'arrivée
 */
function finishAddEdge(cx){
    if(uimode == GJ_TOOL_ADD_EDGE && tmp_edge[0] instanceof Vertex && tmp_edge[1] instanceof Vertex){
        graph.addEdge(tmp_edge)
        dlog(["Arête créée"])
        clearUimode()
    }
}


/*
 *  Méthode appelée par canvasClick après avoir cliqué quelque part sur le canvas
 */
function finishAddVertex(x, y, cx){
    if(x >= 0 && y >= 0){
        $(" #vertexX ").val(x);
        $(" #vertexY ").val(y);
        $(" #modalCreationVertex ").modal('show');
        $(" #vertexName ").click(); // Ne fonctionne pas. TODO : à corriger
    }
}


// Dessin sur le canvas ------------------------------------------------------------------------------------------

/*
 *  Dessine l'intégralité d'un graphe
 */
function drawAll() {
    // Nettoyage du canvas
    context.clearRect(0, 0, canvas.width, canvas.height)

    var el
    graph.draw()

    // Les éléments sélectionnés ont une surchage de dessin spéciale
    for (var n in selected) {
        el = selected[n]

        if(el instanceof Vertex){
            el.drawSel()
        }

        if(el instanceof Edge){
            var g = graph.edgeGroups(el.groupName())

            for (var i in g) {
                if(g[i] == el){
                    g[i].drawSel(g.length, i)
                }
            }
        }
    }
}


// Evenements touch triggers -------------------------------------------------------------------------------------
// Redirige vers les méthodes canvasXXX comme dans un environnement non-tactile

/*
 *  touchMove --> moved + canvasMove
 */
function touchMove(evt){
    evt.preventDefault()
    if(evt.touches.length == 1 && evt.touches[0].target == canvas){
        var ct = evt.changedTouches
        moved  = true
        dlog(ct)
        canvasMove({ clientX: ct[0].pageX, clientY: ct[0].pageY })
    }
}


/*
 *  touchEnd --> canvasClick
 */
function touchEnd(evt){
    dragging = false
    tmp_edge = [null, null]
    var ct   = evt.changedTouches
    if(!moved && ct.length == 1 && ct[0].target == canvas){
        canvasClick({ clientX: ct[0].pageX, clientY: ct[0].pageY })
    }
    moved = false
}


/*
 *  touchStart --> dragging + canvasMove
 */
function touchStart(evt){
    if(evt.touches.length == 1 && evt.touches[0].target == canvas){
        evt.preventDefault()
        dragging = true
        moved    = false
        var ct   = evt.changedTouches
        if(ct.length > 0){
            canvasMove({ clientX: ct[0].pageX, clientY: ct[0].pageY })
        }
    }
}


// UI modes ------------------------------------------------------------------------------------------------------

/*
 *  Modifie le type d'action en cours de l'utilisateur
 *  (cf. constantes GJ_TOOL)
 */
function setUimode(mode){
    var btn = $(".uimode-" + mode)
    if(btn.length > 0){
        $(".uimode").removeClass("active")
        btn.addClass("active")
        uimode = mode
    }
}


/*
 *  Ramener l'action de l'utilisateur à la manipulation du canvas
 */
function clearUimode(){
    setUimode(GJ_TOOL_SELECT);
    tmp_edge = [null, null];
    selected = [];
    updateState();
}


function displayToolbox(toolname) {
    uiToolbox.hide();

    if (toolname == TOOLBOX_INFO)
        uiToolbox = $(" #info ");
    else if (toolname == TOOLBOX_MATRICE_ADJACENCE)
        uiToolbox = $(" #matrice ");
    else if (toolname == TOOLBOX_MARCHE_ALEATOIRE)
        uiToolbox = $(" #marche-aleatoire ");
    else if (toolname == TOOLBOX_ALGORITHME_DIJKSTRA)
        uiToolbox = $(" #dijkstra ");

    uiToolbox.show();
}


// Fonctionnalités -----------------------------------------------------------------------------------------------

/*
 *  Met à jour la liste des éléments du graphe sélectionnés par l'utilisateur
 */
function setSelected(el, evt){
    var shift = (typeof evt != undef && evt != null && "shiftKey" in evt && evt.shiftKey)
    // On clique à côté d'un élément sans maintenir la sélection courante
    if (!shift)
        selected = []

    // Màj de la liste des éléments selectionnés
    if (el instanceof Vertex || el instanceof Edge)
        selected[el.id] = el
}


/*
 *  Demande la confirmation pour rendre le canvas vierge
 */
function clearCanvas(){
    if(confirm("Voulez-vous supprimer le graphe actuel ? L'action est irréversible.")) {
        graph.detach();
        new Graph();
        selected = []
        updateState()
    }
}


/*
 *  Mutualise les instructions de calcul des paramètres nécessaires
 *  au tracé d'une arête incurvée (getElement et edge.draw)
 */
function computeCurveParameters(nbAretes, numArete, arete) {

    // Paramètres de l'incurvation de l'arête
    var bend  = (numArete * EDGE_SPACE - (nbAretes - 1) * EDGE_SPACE / 2) * (arete.groupName()[0] != arete.from.value ? -1 : 1)
    var incl  = Math.atan((arete.to.y - arete.from.y)/(arete.to.x - arete.from.x))
    var coeff = (arete.to.x < arete.from.x) ? -1 : 1
    // Noeud A : noeud de départ
    var ax = arete.from.x + RAYON_NOEUD * Math.cos(incl) * coeff
    var ay = arete.from.y + RAYON_NOEUD * Math.sin(incl) * coeff
    // Noeud B : noeud d'arrivée
    var bx = arete.to.x - RAYON_NOEUD * Math.cos(incl) * coeff
    var by = arete.to.y - RAYON_NOEUD * Math.sin(incl) * coeff

    var mx = 0.5 * (bx + ax)
    var my = 0.5 * (by + ay)
    var lg_AB = Math.sqrt(Math.pow(ay - by, 2) + Math.pow(bx - ax, 2))

    // Alpha : Centre de l'arc, milieu du segment AB "translaté" orthogonalement
    var alphax = mx + bend * (-my + ay) / lg_AB
    var alphay = my + bend * ( mx - ax) / lg_AB

    return {
        'ax' : ax,
        'ay' : ay,
        'bx' : bx,
        'by' : by,
        'alphax' : alphax,
        'alphay' : alphay,
        'lg_AB' : lg_AB
    }
}


/*
 *  Supprime les éléments selectionnés, les arêtes d'abord, puis les sommets
 */
function removeSelection() {
    var deletingElts = trimArray(selected);

    for (var i = 0; i < deletingElts.length; i++) {
        if (deletingElts[i] instanceof Edge) {
            dlog("Suppression arête");
            deletingElts[i].detach();
        }
    }

    for (var i = 0; i < deletingElts.length; i++) {
        if (deletingElts[i] instanceof Vertex) {
            dlog("Suppression noeud");
            deletingElts[i].detach();
        }
    }

    updateState()
    return true;
}


/*
 *  Génère le graphe dans le canvas
 *  à partir du JSON à entrer dans la pop-in
 */
function loadGraphFromJSON(json) {
    if (typeof json == str && json.length > 0) {
        var saveGraph = graph;

        try {
            var obj = JSON.parse(json)
            graph.detach();
            new Graph();

            var v, from, to

            for (var i in obj.vertices) {
                vertex = obj.vertices[i]
                graph.addVertex([vertex.x, vertex.y], vertex.value);
            }

            for (var i in obj.edges) {
                edge = obj.edges[i]
                from = graph.getVertexByName(edge.from)
                to = graph.getVertexByName(edge.to)
                graph.addEdge([from, to])
            }
        } catch(e) {
            dlog(e);
            graph = saveGraph;
        }

        drawAll();
    }
}


/*
 *  Exporte le graphe dans une description JSON
 */
function saveGraphToJSON() {
    jsonGraph = JSON.stringify(graph.toJSON(), null, 4)
    $(" #json-area ").html(jsonGraph);
    $(" #modalSaveGraph ").modal('show')
}

// Méthodes d'affichage des données sur l'interface --------------------------------------------------------------

/*
 *  Mise à jour de l'affichage
 */
function updateState(info){
    // Propriétés
    if (info != false)
        fillInfobox(selected)

    // Canvas : redimensionnement et recréation du graphe
    context.canvas.width = $("#canvas-container").width()
    drawAll()

    // Mise à jour de la liste des éléments (panneau latéral)
    displayElements()
}

function updateToolbox() {
    // TODO : mettre ici les appels à matriceAdjacence et marcheAleatoire
    // et placer un appel à la fonction là où il y a modification du graphe (comme updateState)
}  


/*
 *  Génère le contenu de l'infobox en bas de l'écran
 */
function fillInfobox(elt) {
    if (elt instanceof Array) {
        elt = trimArray(elt)

        if (elt.length > 1) {
            $(" #info ").html(htmlMessages.multiselection)
            return
        } else {
            elt = elt[0]
        }
    }

    if(elt != null){
        // ===== Infobox Noeud =====
        if(elt instanceof Vertex){
            var info = $(formatInfoboxVertex(elt))
        }
        // ===== Infobox Arête =====
        else if(elt instanceof Edge){
            var info = $(formatInfoboxEdge(elt))
            $(".contractbtn", info).click(function(){ elt.contract(); updateState() })
        }
        $("input#label", info).keyup (function(){ elt.value = this.value; drawAll() })
        $("input#label", info).change(function(){ elt.value = this.value; updateState() })

    // ===== Infobox Graphe =====
    } else {
        var info  = $(formatInfoboxGraph())
        $(".adjustbtn", info).click(function(){ graph.readjust(); updateState(); })
    }
    $(" #info ").empty().append(info)
}


/*
 *  Affiche les éléments du graphe dans le panneau latéral
 */
function displayElements(){
    var list = ""

    // Noeuds
    if(graph.vertices.length > 0){
        list += formatVerticesList();
    }
    // Arêtes
    if(graph.edges.length > 0){
        list += formatEdgesList();
    }
    list = $(list);
    
    // Clic handler sur les éléments du panneau latéral
    $("a", list).click(function(evt){
        var [elt_type, id] = this.parentNode.id.split("-")
        var elt = null
        evt.preventDefault()

        if(is_numeric(id)) {
            // Détermination de l'élément sélectionné
            if (elt_type == "vertex")
                elt = graph.vertices[id]
            else if (elt_type == "edge")
                elt = graph.edges[id]

            // Sélection multiple ?
            if (evt.ctrlKey)
                selected.push(elt)
            else
                selected = [elt]
        }
        updateState()
    })
    $("ul.elements", "#elements").empty().append(list)
}


// Méthodes des toolbox ------------------------------------------------------------------------------------------

function matriceAdjacence() {
    displayToolbox(TOOLBOX_MATRICE_ADJACENCE);
    
    $(" #matrice ").show();
    matrice = graph.adjacencyMatrix( false, parseInt($(" #path-length ").val()) );
    $(" #tab-matrice ").html(formatMatrix(matrice, true));

    // TODO : a replacer de meilleur façon
    $(" #path-length ").on("change", matriceAdjacence);
}


function marcheAleatoire() {
    displayToolbox(TOOLBOX_MARCHE_ALEATOIRE);

    if (!graph.directed) {
        graph.directed = true;
        updateState();
    }

    matriceTransition = graph.transitionMatrix(false);
    if (matriceTransition == null) {
        $(" #tab-marche ").html(htmlMessages.erreurMatrice);
        $(" #tab-etat ").html("");
    } else {
        $(" #tab-marche ").html(formatMatrix(matriceTransition, false));
        $(" #tab-etat ").html(formatEtatProbabiliste());
    }
    
    $(" #marche-aleatoire ").show();
}


/*
 *  Exécution de l'algorithme de Dijkstra pour la recherche du plus court chemin
 *  Fonctionne aussi bien pour des graphes orientés ou non orientés
 */
function algoDijkstra(noeudDep) {
    displayToolbox(TOOLBOX_ALGORITHME_DIJKSTRA)

    var visited = []
    var selected = noeudDep;

    // Initialisation des valuations des noeuds pour l'algorithme
    /*for (var i = 0; i < graph.vertices; i++) {
        if (graph.vertices[i] === noeudDep)
            graph.vertices[i].weigh = 0
        else
            graph.vertices[i].weigh = Infinity
    }

    // Tant que l'on ne s'est pas interessé à tous les noeuds
    while (visited.length != graph.vertices.length) {
        // Choisir un sommet s1 hors de P de plus petite valeur
        for (var i = 0; i < graph.vertices; i++) {
            if ( !(graph.vertices[i] in P) && graph.vertices[i].weigh <= selected )
                selected = graph.vertices[i];
        }

        // Mettre ce sommet dans P
        P.push(selected)

        // Pour chaque sommet s2 voisin de s1 n appartenant pas à P :
        successeurs = (graph.directed) ? selected.successeurs() : selected.neighbours();
        for (var i = 0; i < successeurs.length; i++) {
            if ( !(successeurs[i] in P) )
                successeurs[i].weigh = Math.min(successeurs[i].weigh, selected.weigh) //+ edge.value)
        }
    }*/
}