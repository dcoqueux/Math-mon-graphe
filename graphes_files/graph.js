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
        if(
            x >= el.x - r && x <= el.x + r &&
            y >= el.y - r && y <= el.y + r
        ){
            return el // This is the one!
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
            var space = 50
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
    var p = evtPosition(evt, canvas_elt), el
    var x = p[0]
    var y = p[1]
    
    if(dragging && uimode == GJ_TOOL_SELECT){
        // Set dragging position
        if(dp[0] == null){
            dp = [x,y]
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
                dp = [x,y]
            }
            // Drag each selected element
            for(var n in selected){
                el = selected[n]
                if(el instanceof Vertex){
                    // Set original vertex position
                    if(dp[0] == x && dp[1] == y){
                        el.ox = el.x
                        el.oy = el.y
                    }

                    // New coordinates (not too close to the edge)
                    el.x = Math.max(5, el.ox + (x - dp[0]))
                    el.y = Math.max(5, el.oy + (y - dp[1]))
                }
            }
            updateState() // <-- Inefficient
        } else {
            // We're dragging a rectangle of selection
            var selection  = graph.elementsWithinRect(dp[0], dp[1], x, y)
            //selected       = evt.shiftKey ? selected.concat(selection) : selection
            if(!evt.shiftKey){ selected = [] }
            for(var i in selection){
                selected[selection[i].id] = selection[i]
            }
            drawAll()
            context.strokeStyle = "rgba(153,153,153,0.5)"
            context.lineWidth   = 1
            context.strokeRect(dp[0], dp[1], x-dp[0], y-dp[1])
        }
        if(!touch){
            dontclick = true // Prevent click event on mouseup
        }
    } else {
        //hovered = getElement(x,y)
        if(uimode == GJ_TOOL_ADD_EDGE){
            hovered = getElement(x,y)
            if(touch && hovered instanceof Vertex){
                dp[(dp[0] == null) ? 0 : 1] = hovered
                selected = [hovered]
                finishAddEdge(context)
            }
        } else {
            dp = [null,null]
        }
    }
}


/*
 *  Fonction exécutée à l'évènement clic
 */
function canvasClick(evt){
    dlog(["CLICK", dragging, dontclick])
    if(!dragging && !dontclick){
        var p    = evtPosition(evt, canvas_elt)
        var x    = p[0]
        var y    = p[1]
        var el   = getElement(x,y)
        var alt  = (evt.altKey || evt.ctrlKey)
        dlog([el, uimode, $("#vertexautocomplete")])
        if(uimode == GJ_TOOL_SELECT){
            dlog(1)
            setSelected(el, evt, context)
            updateState()
        }
        if(uimode == GJ_TOOL_SELECT && alt && evt.shiftKey && el instanceof Vertex){
            dlog(2)
            startAddEdge(context)
        }
        if(uimode == GJ_TOOL_ADD_EDGE && el instanceof Vertex){
            dlog(3)
            dp[(dp[0] == null) ? 0 : 1] = el
            selected        = []
            selected[el.id] = el
            updateState(false)
            finishAddEdge(context)
        }
        if((uimode == GJ_TOOL_ADD_VERTEX || (uimode == GJ_TOOL_SELECT && alt && !evt.shiftKey)) && el == null){
            dlog(4)
            finishAddVertex(x, y, context)
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
        dp = [null,null]; updateState();
    })
    panel.empty().append(msg)

    selected  = [null]
    dp        = [null,null]
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
    dp        = [null,null]
    updateState(false)
    panel.empty().append(msg)
    setUimode(GJ_TOOL_ADD_VERTEX)
}


/*
 *  
 */
function finishAddEdge(cx){
    if(uimode == GJ_TOOL_ADD_EDGE && dp[0] instanceof Vertex && dp[1] instanceof Vertex){
        graph.addEdge(dp, cx)
        clearUimode()
    }
}


/*
 *  
 */
function finishAddVertex(x, y, cx){
    if(x >= 0 && y >= 0){
        var v = graph.addVertex([x,y], cx)
        //dlog($("#vertexautocomplete"))
        if($("#vertexautocomplete").is(":checked")){ // Kind of rough right now
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
 *  Affiche l'étiquette d'un noeud
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
    dp       = [null,null]
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
 *  
 */
function setUimode(mode){
    var btn = $(".uimode-" + mode)
    if(btn.length > 0){
        $(".uimode").removeClass("selected")
        btn.addClass("selected")
        uimode = mode
    }
}


/*
 *  
 */
function clearUimode(){
    setUimode(GJ_TOOL_SELECT)
    dp       = [null,null]
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
                ui.properties.html('<div class="selection"><strong>Sélection multiple</strong></div>')
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
 *  Demande la confirmation 
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
    var t
    if (el instanceof Vertex) { 
        t = "vertex" 
    } else if (el instanceof Edge) { 
        t = "edge"  
    } else { 
        return false 
    }
    var r = confirm("Are you sure you want to remove this " + t + "?")
    if(r){
        graph.detachChild(el)
        updateState()
    }
    return r
}


/*
 *  Construit un graphe à partir d'un fichier JSON
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
    prompt("Voici une description du graphe en JSON. Sauvez-là dans un fichier texte",
        JSON.stringify(graph.toJSON()) );
}

// Méthodes d'affichage des données -----------------------------------------------------

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

    if(el instanceof Array){
        el = trimArray(el)
        if(el.length > 1){
            panel.html('<h2>Multiselection</h2>')
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
                    '<button class="btn btn-danger r button removebtn">Supprimer noeud</button>' +
                    '<h2>Noeud ' + he(el.value) + '</h2>' +
                    '<div class="col">' + 
                        '<p class="field">' +
                            '<label for="label">Nom : </label>' +
                            '<input type="text" id="label" size="3" value="' + he(el.value) + '" autocapitalize="off">' +
                        '</p>' +
                        '<p class="field"><span class="i">Degré : </span>' + he(el.degree) + '</p>' +
                    '</div>' +
                '</div>'
            )
            $("input#label", info).keyup (function(){ el.value = this.value; drawAll() })
            $("input#label", info).change(function(){ el.value = this.value; updateState() })
            $("a.removebtn", info).click(function(){ removeElement(el, graph, cx) })
        }
        // ===== Infobox Arête =====
        else if(el instanceof Edge){
            var info = $(
                '<div>' +
                    '<div class="r" style="white-space:nowrap">' +
                        '<button class="btn btn-warning button contractbtn">Contract arête</button>' +
                        '<button class="btn btn-danger button removebtn">Supprimer arête</button>' +
                    '</div>' +
                    '<h2>Arête [' + he(el.from.value) + ' -> ' + he(el.to.value) + ']</h2>' +
                    '<div class="col">' +
                        '<p class="field">' +
                            '<label for="label">Poids : </label>' +
                            '<input type="text" id="label" size="3" value="' + he(el.value) + '" autocapitalize="off">' +
                        '</p>' +
                    '</div>' +
                '</div>'
            )
            $("input#label", info).keyup (function(){ el.value = this.value; drawAll() })
            $("input#label", info).change(function(){ el.value = this.value; updateState() })
            $("a.contractbtn", info).click(function(){ graph.contractEdge(el); updateState() })
            $("a.removebtn", info).click(function(){ removeElement(el, graph, cx) })
        }
    } else {
        // ===== Infobox Graphe =====
        var adj = []
        var autoname = ""

        if (graph.vertices.length <= 0) {
            adj.push("empty")
        } 
        else {
            if(graph.isWeighted()){
                adj.push("weighted")
            }
            if(graph.isComplete()){
                adj.push("complete")
                autoname = "<em>K</em><sub>" + graph.vertices.length + "</sub>"
            }
        }
        var title = (adj.length > 0 ? ucf(adj.join(" ")) + " g" : "G") + "raphe" + (autoname ? " " + autoname : "")
        var info  = $(
            // Graph info
            '<div>' +
            '<h2>' + title + '</h2>' +
            '<div class="col">' +
                '<p class="field"><span class="i">Nb de noeuds: </span>' + graph.vertices.length + '</p>' +
                '<p class="field"><span class="i">Nb d\'arêtes: </span>' + graph.edges.length + '</p>' +
            '</div>' +
            '</div>'
        )
    }
    panel.empty().append(info)
}


/*
 *  Affiche les éléments du graphe dans le panneau latéral
 */
function displayElements(panel){
    var list = "", a

    // Vertices
    if(graph.vertices.length > 0){
        list += '<li class="h">Noeuds</li>'
        for(var i in graph.vertices){
            a = graph.vertices[i]
            list += '<li id="vertex-' + i + '"' + 
                (inArray(a, selected) ? ' class="selected"' : '') + '>' +
                '<a href="javascript://">Noeud ' + he(a.value) + '</a></li>'
        }
    }
    // Edges
    if(graph.edges.length > 0){
        list += '<li class="h">Arêtes</li>'
        for(var i in graph.edges){
            a = graph.edges[i]
            list += '<li id="edge-' + i + '"' + 
                (inArray(a, selected) ? ' class="selected"' : '') + '>' +
                '<a href="javascript://">Arête [' + he(a.from.value) + ' -> ' + he(a.to.value) + ']' +
                ' (Poids : ' + he(a.value) + ')</a></li>'
        }
    }
    //list += '</ul>'
    list  = $(list) //$('<h2>Elements</h2>' + list)
    // Click handler
    $("a", list).click(function(evt){
        var id = this.parentNode.id.split("-"), el = null
        evt.preventDefault()
        if(id.length > 1 && is_numeric(id[1])){
            if(id[0] == "vertex"){
                el = graph.vertices[id[1]]
            }
            if(id[0] == "edge"){
                el = graph.edges[id[1]]
            }
        }
        if(el){
            if(evt.shiftKey){
                selected.push(el)
            } else {
                selected = [el]
            }
        }
        updateState()
    })
    $("ul.elements", panel).empty().append(list)
}


/*
 *  
 */
function inputNumberKeyUp(el, evt){
    var val = parseInt(el.value)
    if(!isNaN(val)){
        var code = evt.keyCode || evt.which, up = 38, down = 40
        if(code == up || code == down){ // Increase or decrease
            if (code == up) { val++ }
            else            { val-- }
            el.value = val
        }
    }
    return val
}