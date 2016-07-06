// GRAPH JS =============================================================================

// Récupération de données sur le canvas ------------------------------------------------

/*
 *  Retrouve un élément du graphe à partir des coordonnées en argument
 */
function getElement(x, y){
    var el, r

    // Un noeud ?

    for(var i = vertices.length - 1; i >= 0; i--){
        el = vertices[i]
        r  = el.style.vertexradius * (touch ? 3 : 1.5)
        //w  = el.style.strokewidth
        if(Math.abs(x - el.x) <= r && Math.abs(y - el.y) <= r) {
            return el
        }
    }
    
    // Arêtes : Approche selon les courbes de Bezier

    var tol = 3 // Tolerance = distance max à la souris
    var edgegroups = graph.edgeGroups()
    // We find points on e with distance h (in pixels)
    var h = 5
    
    for(var s in edgegroups){
        //alert("Here")
        g = edgegroups[s]
        for(var i in g){
                // Now we have edge e
                var e = g[i]
                // There is "total" edges in this group
                var total = g.length
                // This is number "i" of them
                // Edge curvature
            var space = 150
            var span  = (total-1) * space
            var bend  = -span/2 + i*space

            // Curved edge, part of multiedge
            // Curve from a to b, with control point alpha.
            // m is the midpoint of ab
                if(e.from.x < e.to.x) {
                var ax = e.from.x
                var ay = e.from.y
                var bx = e.to.x
                var by = e.to.y
            } else {
                var ax = e.to.x
                var ay = e.to.y
                var bx = e.from.x
                var by = e.from.y
            }
            var mx = ax + 0.5 * (bx - ax)
            var my = ay + 0.5 * (by - ay)
            
            // Length of am, since we need to normalize it
            var l = Math.sqrt((ay-by)*(ay-by) + (bx-ax)*(bx-ax))

            // Find the center point of the quadrature
            var alphax = mx + bend * (-my+ay)/l
            var alphay = my + bend * (mx-ax)/l
            
            // Now we have the following function of the quadratic curve Q(t)
            // Q(t) = (1-t)^2 a + 2(1-t)t alpha + t^2 b, where t = 0..1
            // Compute each of the d points
            var n = l*2 // length of ab

            // Take n/h steps of length h
            for (var j = 0; j < n; j += h) {
                // Find the corresponding value for t
                var t = j/n
                
                // Compute coordinates of Q(t) = [Qx,Qy]
                var Qx = (1-t)*(1-t) * ax + 2*(1-t)*t * alphax + t*t * bx
                var Qy = (1-t)*(1-t) * ay + 2*(1-t)*t * alphay + t*t * by
                
                distToMouse = Math.sqrt((Qy-y)*(Qy-y) + (Qx-x)*(Qx-x))

                if (distToMouse < tol) {
                    return e
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
    ) - o.left

    // Ordonnée
    var y = (!is_undefined(evt.clientY) ? evt.clientY : 
        (is_undefined(evt.offsetY) ? evt.y : evt.offsetY)
    ) - o.top

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
            //if(touch){
                hovered = getElement(x,y)
            //}
        }
        // We're trying to drag an element
        if(hovered != null){
            // Set selection
            if(!inArray(hovered, selected)){
                setSelected(hovered, evt, context)
                tmp_edge = [x,y]
            }
            // Drag each selected element
            for(var n in selected){
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
            for(var i in selection){
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
        if(uimode == GJ_TOOL_ADD_EDGE){
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

            for(var i in selected){
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
function startAddEdge(cx){
    var panel = ui.properties

    // Infobox
    var msg   = $('<h2>Nouvelle arête</h2>' +
        '<p>Cliquez sur deux noeuds à lier par une nouvelle arête. ' +
        '<a href="javascript://">Retour</a></p>')
    
    $("a", msg).click(function(){ 
        setUimode(GJ_TOOL_SELECT); 
        tmp_edge = [null,null]; updateState();
    })
    panel.empty().append(msg)

    selected  = [null]
    tmp_edge        = [null,null]
    updateState(false)
    setUimode(GJ_TOOL_ADD_EDGE)
}


/*
 *  Trigger enclenché au clic du bouton "Ajout d'un noeud"
 */
function startAddVertex(cx){
    var panel = ui.properties
    var msg   = $('<h2>Add vertex</h2>' +
        '<p>Click anywhere on the canvas to place a vertex.<a href="javascript://"> Back</a></p>' +
        '<p><span>' +
        '<input type="checkbox" id="vertexautocomplete">' +
        '<label for="vertexautocomplete">Auto-complete graph</label>' +
        '</span></p>'
    )

    // Enclenche la génération automatique d'arêtes autour du nouveau noeud
    $("a", msg).click(function(){ 
        setUimode(GJ_TOOL_SELECT); 
        updateState(); 
    })

    selected  = [null]
    tmp_edge        = [null,null]
    updateState(false)
    panel.empty().append(msg)
    setUimode(GJ_TOOL_ADD_VERTEX)
}


/*
 *  
 */
function finishAddEdge(cx){
    if(uimode == GJ_TOOL_ADD_EDGE && tmp_edge[0] instanceof Vertex && tmp_edge[1] instanceof Vertex){
        graph.addEdge(tmp_edge, cx)
        dlog(["Arête créée"])
        clearUimode()
    }
}


/*
 *  
 */
function finishAddVertex(x, y, cx){
    if(x >= 0 && y >= 0){
        var value = prompt("Nom du nouveau noeud ?")
        var v = graph.addVertex([x,y], value, cx)

        if( $("#vertexautocomplete").is(":checked") ) { 
            graph.semiComplete(v)
            updateState(false)
        } else {
            clearUimode()
        }
    }
}


// Dessin sur le canvas -----------------------------------------------------------------

/*
 *  Dessine l'intégralité d'un graphe
 */
function drawAll(cx) {
    // dlog("DRAWING ALL")
    if(!cx){ cx = context }

    // Nettoyage du canvas
    cx.clearRect(0, 0, canvas.width, canvas.height)

    var el
    graph.draw(cx)

    // Selected item
    if(selected.length > 0){
        for(var n in selected){
            el = selected[n]
            if(el instanceof Vertex){// || el instanceof Edge){
                el.drawSel(cx)
            }
            if(el instanceof Edge){
                // Get edgegroup
                var g = graph.edgeGroups(el.groupName())
                for(var i in g){
                    if(g[i] == el){
                        g[i].drawSel(cx, g.length, i)
                    }
                }
            }
        }
    }
}


/*
 *  Affiche l'étiquette d'un noeud ou d'une arête
 */
function drawLabel(cx, label, x, y){
    if(!cx){ cx = context }
    if((typeof label == str || typeof label == nb) && label !== ""){
        styleContext(cx, labelStyle)
        cx.beginPath()
        cx.arc(x, y, 10 /*labelStyle.vertexradius*/, 0, 2*Math.PI, true)
        cx.closePath()
        cx.fill()
        cx.stroke()
        cx.fillStyle = "#000"
        cx.fillText(label, x, y)
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
    tmp_edge       = [null,null]
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
    tmp_edge       = [null,null]
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
                ui.properties.html(
                    '<button class="btn btn-sm btn-danger infoboxbtn">Supprimer sélection</button>' +
                    '<h2>Multiselection</h2>'
                )
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
function clearCanvas(cx, force){
    if(force || confirm("Voulez-vous supprimer le graphe actuel ? L'action est irréversible.")) {
        edges    = [];
        vertices = [];
        graph    = null;
        new Graph();
        selected = [null]
        updateState()
    }
}


/*
 *  Demande la confirmation de suppression d'un noeud / d'une arête,
 *  et supprime l'élément auquel cas.
 */
function removeElement(el, graph, cx){
    var type_elt = el instanceof Vertex ? "du noeud" : "de l'arête";
    dlog("Remove " + type_elt);

    var rep = confirm("Vous confirmez la suppression " + type_elt + "?")
    if (rep) {
        graph.detachChild(el)
        updateState()
    }
    return rep
}

/*
 *  Construit un graphe à partir d'un fichier JSON
 *  TODO : inclure cette méthode dans la classe Graph et utiliser loadGraphFromJson
 */
function graphFromJSON(json){
    if(typeof json != str){ return null }
    try {
        var o = JSON.parse(json)
    } catch(e){
        return null
    }
    var vertices = [], edges = [], j, v, from, to
    for(var i in o.vertices){
        j = o.vertices[i]
        vertices.push(new Vertex(j.id, j.value, j.x, j.y))
        // { id: this.id, value: this.value, x: this.x, y: this.y }
    }
    for(var i in o.edges){
        j = o.edges[i]
        for(var i in vertices){
            v = vertices[i]
            if(v.id == j.from){
                from = v
            }
            if(v.id == j.to){
                to   = v
            }
        }
        edges.push(new Edge(j.id, j.value, from, to, j.directed))
        // { id: this.id, value: this.value, from: this.from.id, to: this.to.id }
    }
    var g = new Graph(vertices, edges)
    g.x   = o.x
    g.y   = o.y
    return g
}


/*
 *  Génère le graphe dans le canvas
 *  à partir du JSON à entrer dans la pop-in
 */
function loadGraphFromJSON() {
    var json = prompt("Importez le graphe en insérant sa description en JSON ci-dessous"); 
    if (json != null && json.length > 0) { 
        clearCanvas(context, true); 
        graph = null; 
        graphFromJSON(json); 
        drawAll(context);
    }
}


/*
 *  Exporte le graphe dans une description JSON
 */
function saveGraphToJSON() {
    prompt(
        "Voici une description du graphe en JSON. Sauvez-là dans un fichier texte",
        JSON.stringify(graph.toJSON())
    );
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
    if(typeof info != bool || (typeof info == bool && info)){ 
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
            panel.html(
                '<button class="btn btn-sm btn-danger infoboxbtn">Supprimer sélection</button>' +
                '<h2>Multiselection</h2>'
            )
            return
        } else {
            el = el[0]
        }
    }

    if(el != null){
        // ===== Infobox Noeud =====
        if(el instanceof Vertex){
            var info = $(
                '<div>' +
                    '<button class="btn btn-sm btn-danger removebtn infoboxbtn">Supprimer noeud</button>' +
                    '<h2>Noeud ' + he(el.value) + '</h2>' +
                    '<p>' +
                        '<label for="label">Nom : </label>' +
                        '<input type="text" id="label" size="3" value="' + he(el.value) + '" autocapitalize="off">' +
                    '</p>' +
                    '<p class="field"><span class="i">Degré : </span>' + he(el.degree) + '</p>' +
                '</div>'
            )
        }
        // ===== Infobox Arête =====
        else if(el instanceof Edge){
            var info = $(
                '<div>' +
                    '<div class="btn-group btn-group-sm infoboxbtn">' +
                        '<button class="btn btn-warning contractbtn" title="Fusionne les noeuds liés par l\'arête">Contracter arête</button>' +
                        '<button class="btn btn-danger removebtn">Supprimer arête</button>' +
                    '</div>' +
                    '<h2>Arête [' + he(el.from.value) + ' -> ' + he(el.to.value) + ']</h2>' +
                    '<p>' +
                        '<label for="label">Poids : </label>' +
                        '<input type="text" id="label" size="3" value="' + he(el.value) + '">' +
                    '</p>' +
                    '</div>' +
                '</div>'
            )
            $(".contractbtn", info).click(function(){ graph.contractEdge(el); updateState() })
        }
        $("input#label", info).keyup (function(){ el.value = this.value; drawAll() })
        $("input#label", info).change(function(){ el.value = this.value; updateState() })
        $(".removebtn", info).click(function(){ removeElement(el, graph, cx) })

    // ===== Infobox Graphe =====
    } else {
        var info  = $(
            // Graph info
            '<div>' +
                '<button class="btn btn-sm btn-success adjustbtn infoboxbtn" title="Replace les noeuds dans le canvas">Réajuster graphe</button>' +
                '<h2>Graphe</h2>' +
                '<p><span>Nb de noeuds: </span>' + graph.vertices.length + '</p>' +
                '<p><span>Nb d\'arêtes: </span>' + graph.edges.length + '</p>' +
                '<p><span>Complet ? </span>' + (graph.isComplete() ? "Oui" : "Non") + '</p>' +
            '</div>'
        )
        $(".adjustbtn", info).click(function(){ graph.readjust(); updateState(); })
    }
    panel.empty().append(info)
}


/*
 *  Affiche les éléments du graphe dans le panneau latéral
 */
function displayElements(panel){
    var list = ""
    var elt = null

    // Noeuds
    if(graph.vertices.length > 0){
        list += '<li class="h">Noeuds</li>'
        for(var i in graph.vertices){
            elt = graph.vertices[i]
            list += '<li id="vertex-' + i + '"' + 
                (inArray(elt, selected) ? ' class="selected"' : '') + '>' +
                '<a href="javascript://">Noeud ' + he(elt.value) + '</a></li>'
        }
    }
    // Arêtes
    if(graph.edges.length > 0){
        list += '<li class="h">Arêtes</li>'
        for(var i in graph.edges){
            elt = graph.edges[i]
            list += '<li id="edge-' + i + '"' + (inArray(elt, selected) ? ' class="selected"' : '') + '>'
                + '<a href="javascript://">Arête '
                + (elt.directed ? '[' + he(elt.from.value) + ' -> ' + he(elt.to.value) + ']' :
                    '(' + he(elt.from.value) + ', ' + he(elt.to.value) + ')')
                + (elt.value != "" ? ' (Poids : ' + he(elt.value) + ')' : '') 
                + '</a></li>'
        }
    }
    list  = $(list)
    
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