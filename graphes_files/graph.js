// GRAPH JS =============================================================================

// Récupération de données sur le canvas ------------------------------------------------

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


// Canvas triggers ----------------------------------------------------------------------

/* 
 *  Modifie le canvas en temps réel à l'action "drag & drop" de l'utilisateur
 */
function canvasMove(evt){
    var [x,y] = evtPosition(evt, canvas_elt)
    var el
    
    if(dragging && uimode == GJ_TOOL_SELECT){
        dlog("Drag")
        // Set dragging position
        if(tmp_edge[0] == null){
            tmp_edge = [x,y]
            // Simulated hovering on touch devices
            hovered = getElement(x,y)
        }

        // We're trying to drag an element
        if(hovered != null){
            // Set selection
            if(!inArray(hovered, selected)){
                setSelected(hovered, evt, context)
                tmp_edge = [x,y]
            }
            // Drag each selected element
            for (var n in selected) {
                el = selected[n]
                if(el instanceof Vertex){
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
            updateState() // <-- Inefficient
        } else {
            // We're dragging a rectangle of selection
            var selection  = graph.elementsWithinRect(tmp_edge[0], tmp_edge[1], x, y)
            //selected       = evt.shiftKey ? selected.concat(selection) : selection
            if(!evt.shiftKey){ selected = [] }
            for (var i in selection) {
                selected[selection[i].id] = selection[i]
            }
            drawAll()
            context.strokeStyle = "rgba(153,153,153,0.5)"
            context.lineWidth   = 1
            context.strokeRect(tmp_edge[0], tmp_edge[1], x-tmp_edge[0], y-tmp_edge[1])
        }

        if(!touch){
            dontclick = true // Prevent click event on mouseup
        }
    } else {
        //hovered = getElement(x,y)
        if (uimode == GJ_TOOL_ADD_EDGE) {
            hovered = getElement(x,y)
            if(touch && hovered instanceof Vertex){
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
            setSelected(elmt, evt, context)
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

    if(dontclick){ dontclick = false }
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
            displayInfo(ui.properties, selected)
        }
    }
}

// Méthodes d'actions sur l'application -------------------------------------------------

/*
 *  Trigger enclenché au clic du bouton "Ajout d'une arête"
 */
function startAddEdge(){
    var msg = $(htmlMessages.nvlArete)
    
    // Activation du bouton d'annulation de création
    $("#cancelEdge", msg).click(function(){ 
        setUimode(GJ_TOOL_SELECT); 
        tmp_edge = [null,null];
        updateState();
    })

    ui.properties.empty().append(msg)

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

    // Activation du bouton d'annulation de création
    $("#cancelVertex", msg).click( function(){ 
        setUimode(GJ_TOOL_SELECT); 
        updateState(); 
    })

    selected = [null]
    tmp_edge = [null,null]
    updateState(false)
    ui.properties.empty().append(msg)
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
        $("#vertexX").val(x);
        $("#vertexY").val(y);
        $(" #modalCreationVertex ").modal('show');
        $(" #vertexName ").click(); // Ne fonctionne pas. TODO : à corriger
    }
}


// Dessin sur le canvas -----------------------------------------------------------------

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


// Evenements touch triggers ------------------------------------------------------------
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


// UI modes -----------------------------------------------------------------------------

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
    setUimode(GJ_TOOL_SELECT)
    tmp_edge = [null, null]
    selected = [null]
    updateState()
}


// Fonctionnalités ----------------------------------------------------------------------

/*
 *  Met à jour la liste des éléments du graphe sélectionnés par l'utilisateur
 */
function setSelected(el, evt, cx){
    var shift = (typeof evt != undef && evt != null && "shiftKey" in evt && evt.shiftKey)

    if(typeof el != obj){ el = null }

    if(el == null || el instanceof Vertex || el instanceof Edge){
        if(selected.length <= 0 || (selected.length > 0 && el != selected[0])){
            if(selected.length > 0 && shift){
                ui.properties.html(htmlMessages.multiselection)
            } else {
                // Sélection simple : affichage des propriétés de l'élément
                displayInfo(ui.properties, el, cx)
            }
        }

        /*if (shift) { selected.push(el) } else { selected = [el] }*/
        
        // Màj de la liste des éléments selectionnés
        if(!shift){ selected = [] }
        selected[el == null ? 0 : el.id] = el
    }
}


/*
 *  Demande la confirmation pour rendre le canvas vierge
 */
function clearCanvas(force){
    if(force || confirm("Voulez-vous supprimer le graphe actuel ? L'action est irréversible.")) {
        graph.detach();
        new Graph();
        selected = [null]
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
 *  Demande la confirmation de suppression d'un noeud / d'une arête,
 *  et supprime l'élément auquel cas.
 */
function removeElement(el, graph, cx){
    var type_elt = el instanceof Vertex ? "du noeud" : "de l'arête";
    dlog("Suppression " + type_elt);

    var rep = confirm("Vous confirmez la suppression " + type_elt + "?")
    if (rep) {
        el.detach();
        updateState()
    }
    return rep
}

/*
 *  Construit un graphe à partir d'un fichier JSON
 *  TODO : inclure cette méthode dans la classe Graph et utiliser loadGraphFromJson
 */
function graphFromJSON(json){
    if (typeof json != str) { return null }
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

            // Trouver un moyen de faire le lien noeud / arête
            /*for(var i in graph.vertices){
                v = graph.vertices[i]
                if(v.id == edge.from){
                    from = v
                }
                if(v.id == edge.to){
                    to = v
                }
            }*/
            graph.addEdge([from, to])
        }

    } catch(e) {
        graph = saveGraph;
        return null
    }

    return graph
}


/*
 *  Génère le graphe dans le canvas
 *  à partir du JSON à entrer dans la pop-in
 */
function loadGraphFromJSON() {
    var json = prompt("Importez le graphe en insérant sa description en JSON ci-dessous"); 
    if (json != null && json.length > 0) { 
        clearCanvas(true); 
        graph = null; 
        graphFromJSON(json); 
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

// Méthodes d'affichage des données sur l'interface -------------------------------------

/*
 *  Mise à jour de l'affichage
 */
function updateState(info){
    // Canvas
    context.canvas.width = $("#canvas-container").width()
    drawAll()
    // Propriétés
    if(info != false){ 
        displayInfo(ui.properties, selected) 
    }
    // Elements
    displayElements(ui.elements)
}


/*
 *  Génère le contenu de l'infobox en bas de l'écran
 */
function displayInfo(panel, el, cx){
    if(!cx){ cx = context }

    if (el instanceof Array) {
        el = trimArray(el)
        if (el.length > 1) {
            panel.html(htmlMessages.multiselection)
            return
        } else {
            el = el[0]
        }
    }

    if(el != null){
        // ===== Infobox Noeud =====
        if(el instanceof Vertex){
            var info = $(formatInfoboxVertex(el))
        }
        // ===== Infobox Arête =====
        else if(el instanceof Edge){
            var info = $(formatInfoboxEdge(el))
            $(".contractbtn", info).click(function(){ el.contract(); updateState() })
        }
        $("input#label", info).keyup (function(){ el.value = this.value; drawAll() })
        $("input#label", info).change(function(){ el.value = this.value; updateState() })
        $(".removebtn", info).click(function(){ removeElement(el, graph, cx) })

    // ===== Infobox Graphe =====
    } else {
        var info  = $(formatInfoboxGraph())
        $(".adjustbtn", info).click(function(){ graph.readjust(); updateState(); })
    }
    panel.empty().append(info)
}


/*
 *  Affiche les éléments du graphe dans le panneau latéral
 */
function displayElements(panel){
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
        var id = this.parentNode.id.split("-")
        var elt = null
        evt.preventDefault()

        if(id.length > 1 && is_numeric(id[1])) {

            // Détermination de l'élément sélectionné
            if(id[0] == "vertex"){
                elt = graph.vertices[id[1]]
            } else if(id[0] == "edge"){
                elt = graph.edges[id[1]]
            }

            // Sélection multiple ?
            if (evt.ctrlKey) {
                selected.push(elt)
            } else {
                selected = [elt]
            }
        }
        updateState()
    })
    $("ul.elements", panel).empty().append(list)
}

function matriceAdjacence() {
    /*ui.properties.hide();
    ui.properties = $("#matrice");
    ui.properties.show();*/
    ui.properties.hide();

    
    $(" #matrice ").show();
    matrice = graph.adjacencyMatrix( false, parseInt($(" #path-length ").val()) );
    $(" #tab-matrice ").html(formatMatrix(matrice, true));

    // TODO : a replacer de meilleur façon
    $(" #path-length ").on("change", matriceAdjacence);
}


function marcheAleatoire() {
    ui.properties.hide();
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
 *  Exécution de l'algorithme de Djikstra pour la recherche du plus court chemin
 *  Fonctionne aussi bien pour des graphes orientés ou non orientés
 */
function algoDjikstra(noeudDep) {
    /*
    P = [] // liste de noeuds
    sommet.value = Infinity // pour chaque sommet, sauf pour
    noeudDep.value = 0

    Tant qu il existe un sommet n appartenant pas à P :
        Choisir un sommet s1 hors de P de plus petite valeur
        Mettre ce sommet dans P
        Pour chaque sommet s2 voisin de s1 n appartenant pas à P :
            s2.value = min(s2.value, s1.value + arete(a,b).value)
        Fin Pour
    Fin Tant Que
    */
}