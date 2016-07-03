// GRAPH JS : Classes ===================================================================

// Graphe -------------------------------------------------------------------------------

function Graph(vertices, edges){
    // Constructeur
    if(typeof vertices == undef){ vertices = [] }
    if(typeof vertices != obj){ return false }
    if(typeof edges == undef){ edges = [] }
    if(typeof edges != obj){ return false }

    this.vertices = vertices
    this.edges    = edges
    this.x        = 0 // An offset?
    this.y        = 0
    this.visible  = true
    this.cmpltd   = false
    
    // ===== Constructeur et destructeur =====

    this.attach    = function(){
        this.visible = true;
        graph = this;
    }
    
    this.detach    = function(){
        this.visible = false;
        graph = null;
    }

    // ===== ======
    
    this.draw     = function(cx){
        if(cx != null){
            //dlog(["Drawing graph"])
            var edgegroups = this.edgeGroups(), g
            //dlog(edgegroups)
            for(var s in edgegroups){
                g = edgegroups[s]
                for(var i in g){
                    g[i].draw(cx, g.length, i)
                }
            }
            for(var i in this.vertices){
                this.vertices[i].draw(cx)
            }
            /*if(selected.length <= 0 || selected[0] == this || selected[0] == null){
                displayInfo(ui.properties, null, cx)
            }*/
        }
    }
    
    this.toJSON    = function(){
        var o = { vertices: [], edges: [], x: this.x, y: this.y }
        for(var i in this.vertices){
            o.vertices.push(this.vertices[i].toJSON())
        }
        for(var i in this.edges){
            o.edges.push(this.edges[i].toJSON())
        }
        return o
    }
    
    this.degreeSeq = function(){
        var seq = [], v
        for(var i in this.vertices){
            v = this.vertices[i]
            if(v instanceof Vertex){
                seq.push(v.degree)
            }
        }
        return seq
    }
    
    this.addVertex = function(v, cx){
        if(!cx){ cx = context }
        if(v instanceof Array && v.length == 2){
            v = new Vertex(cid++, "", v[0], v[1])
        }
        if(!(v instanceof Vertex)){
            v = new Vertex(cid++, "", (w/2 + Math.floor(Math.random()*10)), (h/2 + Math.floor(Math.random()*10)))
        }
        this.vertices.push(v)
        v.update(this)
        this.draw(cx)
        this.cmpltd = false
        return v
    }
    
    this.addEdge   = function(e, cx){
        if(!cx){ cx = context }
        if(e instanceof Array && e.length == 2){
            e = new Edge(cid++, "", e[0], e[1])
        }
        if(e instanceof Edge){
            if(inArray(e.from, this.vertices) && inArray(e.to, this.vertices)){
                this.edges.push(e)
                e.update(this)
                this.draw(cx)
                this.cmpltd = false
                return e
            }
        }
        return null
    }
    
    this.detachChild = function(el){
        var list, edges = []
        if(el instanceof Vertex){ list = this.vertices; edges = el.edges }
        else if(el instanceof Edge){ list = this.edges }
        else { return null }
        /*if(edges.length > 0){
            for(var i in edges){
                this.detachChild(edges[i])
            }
        }*/
        while(edges.length > 0){
            this.detachChild(edges[0])
        }
        el.detach()
        listRemove(list, el)
        return el
    }
    
    this.contractEdge = function(e){
        e.contract(this)
    }
    
    this.adjacencyList = function(){
        var l = [], e
        for(var i in this.edges){
            e = this.edges[i]
            l.push([e.from, e.to])
        }
        return l
    }
    
    this.adjacencyMatrix = function(mobj){
        var M = [], v, u, r
        // TODO: Better support for directed graphs and multigraphs
        for(var i in this.vertices){
            v = this.vertices[i]
            r = []
            for(var j in this.vertices){
                u = this.vertices[j]
                //r.push(v.isNeighbour(u) ? 1 : 0)
                r.push(v.edgeMultiplicity(u))
            }
            M.push(r)
        }
        return mobj ? $M(M.length > 0 ? M : [0]) : M
    }
    
    this.degreeMatrix    = function(mobj){
        // Requires Sylvester
        var ds = this.degreeSeq()
        var dl = (ds.length > 0)
        var DM = dl ? Matrix.Diagonal(ds) : $M([0])
        return mobj ? DM : (dl ? DM.elements : [])
    }
    
    this.laplacianMatrix = function(mobj){
        // Requires Sylvester
        var AM = this.adjacencyMatrix(true)
        var DM = this.degreeMatrix(true)
        var LM = DM.subtract(AM)
        return mobj ? LM : LM.elements
    }
    
    this.spanningTreeCount = function(){
        // Requires Sylvester
        var LM = this.laplacianMatrix(true)
        var n  = LM.rows() - 1
        if(n > 1){
            return Math.round(LM.minor(1, 1, n, n).determinant())
        } else if(n == 1){
            return Math.round(Math.abs(LM.elements[0][0]))
        }
        return this.vertices.length >= 1 ? 1 : 0
    }
    
    this.edgeGroups = function(groupname){
        var l = {}, e, name
        for(var i in this.edges){
            e    = this.edges[i]
            name = e.groupName()
            if(!(name in l)){ l[name] = [] }
            l[name].push(e)
        }
        if(groupname){
            return groupname in l ? l[groupname] : null
        }
        return l
    }
    
    this.isWeighted = function(){
        if(this.edges.length <= 0){ return false }
        for(var i in this.edges){
            if(!is_numeric(this.edges[i].value)){
                return false
            }
        }
        return true
    }
    
    this.isComplete = function(){
        // Autocompleted? Yes.
        if(this.cmpltd){ return true }
        // Might still be...
        var n = this.vertices.length
        if(this.edges.length == ((n*(n-1))/2)){
            var seq = this.degreeSeq()
            for(var i in seq){
                if(seq[i] != n-1){
                    return false
                }
            }
            return true
        }
        return false
    }
    
    this.elementsWithinRect = function(x1, y1, x2, y2){
        var xh  = Math.max(x1, x2),
            xl  = Math.min(x1, x2),
            yh  = Math.max(y1, y2),
            yl  = Math.min(y1, y2), a,
            els = []
        // Vertices
        for(var i in this.vertices){
            a = this.vertices[i]
            if(a.x <= xh && a.x >= xl && a.y <= yh && a.y >= yl){
                els.push(a)
            }
        }
        // Edges
        // ????
        return els
    }
    
    this.complete  = function(cx){
        this.edges = []
        for(var i in this.vertices){
            v = this.vertices[i]
            if(v instanceof Vertex){
                v.edges  = []
                v.update(this)
            }
        }
        for(var i in this.vertices){
            v = this.vertices[i]
            if(v instanceof Vertex){
                for(var j in this.vertices){
                    u = this.vertices[j]
                    if(u instanceof Vertex && u !== v){
                        if(!v.isNeighbour(u)){
                            this.addEdge([v,u], cx)
                        }
                    }
                }
            }
        }
        this.cmpltd = true
    }
    
    this.semiComplete = function(v, cx){
        dlog(["Semicomplete", v, v instanceof Vertex])
        if(v instanceof Vertex && inArray(v, this.vertices)){
            for(var j in this.vertices){
                u = this.vertices[j]
                dlog([u,v])
                if(u instanceof Vertex && u !== v){
                    if(!v.isNeighbour(u)){
                        this.addEdge([v,u], cx)
                    }
                }
            }
        }
    }
    
    this.attach()
}

// Noeud --------------------------------------------------------------------------------

function Vertex(id, value, x, y){
    // Constructeur
    if(typeof id != nb){ return false }
    if(typeof value != nb && typeof value != str){ return false }
    if(typeof x != nb || typeof y != nb){ return false }
    
    this.id       = id
    this.value    = value
    this.x        = Math.round(x)
    this.y        = Math.round(y)
    this.degree   = 0
    this.edges    = []
    this.visible  = true
    this.style    = defaultStyle
    
    // ===== Constructeur et destructeur =====

    this.attach    = function(){
        this.visible = true
        vertices.push(this)
    }
    
    this.detach    = function(graph){
        if(graph instanceof Graph){
            graph.detachChild(this)
        } else {
            this.visible = false
            listRemove(vertices, this)
            if(this.id in selected) { 
                delete selected[this.id]
                //listRemove(selected, this) 
            } 
            for(var i in this.edges){
                this.edges[i].detach()
            }
        }
    }

    // ===== =====
    
    this.draw     = function(cx){
        this._draw(cx, this.style, true)
    }
    
    this.drawSel  = function(cx){
        this._draw(cx, selectedStyle, false)
    }
    
    this._draw    = function(cx, style, label){
        styleContext(cx, style)
        cx.beginPath()
        cx.arc(this.x, this.y, style.vertexradius, 0, 2*Math.PI, true)
        cx.closePath()
        cx.fill()
        cx.stroke()
        if(label && (typeof this.value == str || typeof this.value == nb) && this.value !== ""){
            drawLabel(cx, this.value, this.x - 3, this.y +3)
        }
    }
    
    this.update    = function(graph){
        // Update various properties
        this.degree = this.edges.length
    }
    
    this.toJSON    = function(){
        return { id: this.id, value: this.value, x: this.x, y: this.y } // No style support yet
    }
    
    this.isNeighbour = function(v){
        var e
        for(var i in this.edges){
            e = this.edges[i]
            if(
                (e.from === this && e.to   === v) ||
                (e.to   === this && e.from === v)
            ){
                return true
            }
        }
        return false
    }
    
    this.edgeMultiplicity = function(v){
        var e, c = 0
        for(var i in this.edges){
            e = this.edges[i]
            if(
                (e.from === this && e.to   === v) ||
                (e.to   === this && e.from === v)
            ){
                c++
            }
        }
        return c
    }
    
    this.neighbours = function(){
        var n = [], e
        for(var i in this.edges){
            e = this.edges[i]
            if(e.from === this){
                n.push(e.to)
            } else if(e.to === this){
                n.push(e.from)
            }
        }
        return n
    }
    
    this.edgeGroupName = function(to){
        var a = this.id, b = this.to.id
        var c = (a <= b)
        return (c ? a : b) + "," + (c ? b : a)
    }
    
    this.attach()
}

// Arête --------------------------------------------------------------------------------

function Edge(id, value, from, to, directed){
    // Constructeur
    if(typeof id != nb){ return false }
    if(typeof value != nb && typeof value != str){ value = "" }
    if(typeof from != obj || typeof to != obj){ return false }
    if(typeof directed != bool){ directed = false }
    
    this.id       = id
    this.value    = value
    this.from     = from
    this.to       = to
    this.visible  = true
    this.style    = defaultStyle
    this.directed = directed

    // ===== Constructeur et destructeur =====

    this.attach  = function(){
        this.visible = true

        edges.push(this)
        this.from.edges.push(this)
        this.to.edges.push(this)

        this.from.degree++
        this.to.degree++
    }
    
    this.detach  = function(graph){
        if(graph instanceof Graph){
            graph.detachChild(this)
        } else {
            this.visible = false
            listRemove(edges,           this)
            if(this.id in selected){ delete selected[this.id] } //listRemove(selected,        this)
            listRemove(this.from.edges, this)
            listRemove(this.to.edges,   this)
            this.from.degree--
            this.to.degree--
        }
    }

    // ===== =====
    
    this.draw    = function(cx, total, i){
        this._draw(cx, this.style, true, total, i)
    }
    
    this.drawSel = function(cx, total, i){
        this._draw(cx, selectedStyle, false, total, i)
    }
    
    /*
     * total : nb d'aretes entre deux memes noeuds
     * i : index de l'arete parmi l'ensemble des aretes communes à deux memes noeuds
     */
    this._draw   = function(cx, style, label, total, i){
        if(this.visible){
            if(typeof total == undef || total <= 0){ total = 1 }
            if(typeof i     == undef || i     <  0){ i     = 0 }
            
            // Détermination de l'incurvation de l'arête
            var space = 50
            var span  = (total-1) * space
            var t     = -span/2 + i*space
            // Noeud A : noeud de départ
            var ax = this.from.x
            var ay = this.from.y
            // Noeud B : noeud d'arrivée
            var bx = this.to.x
            var by = this.to.y

            // dlog(["Drawing", total, i, t])
            
            styleContext(cx, style, false)
            cx.beginPath()
            cx.moveTo(ax, ay)
            
            if(t == 0){
                // Arête rectiligne : arête unique ou arête médiane
                cx.lineTo(bx, by)
            } else {
                // Arête courbée : l'arête entre les 2 noeuds n'est pas unique

                // Alpha : Centre de l'arc, milieu du segment AB "translaté" orthogonalement
                var mx = 0.5 * (bx + ax)
                var my = 0.5 * (by + ay)
                var lg_AB = Math.sqrt(Math.pow(ay - by, 2) + Math.pow(bx - ax, 2))
                
                var alphax = mx + t * (-my + ay) / lg_AB
                var alphay = my + t * (mx - ax) / lg_AB

                // Trace l'arc jusqu'à B en passant par alpha
                cx.quadraticCurveTo(alphax, alphay, bx, by)
            }
            
            cx.stroke()
            
            // TODO: Draw arrowhead
            
            if(label && (typeof this.value == str || typeof this.value == nb) && this.value !== ""){
                var mid = this.midpoint()
                drawLabel(cx, this.value, mid[0], mid[1])
            }
        }
    }
    
    this.update  = function(graph){}
    
    this.contract = function(graph){
        var e, m = this.midpoint()
        this.detach(graph)
        dlog(this.from.edges)
        for(var i in this.to.edges){
            e = this.to.edges[i]
            if(e.to == this.to){
                e.to = this.from
            }
            if(e.from == this.to){
                e.from = this.from
            }
            if(e.from == e.to){ // Contracted into nonexistance
                this.to.edges.splice(i, 1)
                e.detach(graph)
                i--
            }
            this.from.edges.push(e)
        }
        dlog(this.from.edges)
        this.to.edges = []
        this.to.update()
        this.to.detach(graph)
        dlog([[this.from.x, this.from.y],[this.to.x, this.to.y],m])
        this.from.x = m[0]
        this.from.y = m[1]
        this.from.update()
    }
    
    this.toJSON  = function(){
        return { 
            id: this.id, 
            value: this.value, 
            from: this.from.id, 
            to: this.to.id, 
            directed: this.directed 
        } // No style support yet
    }
    
    this.midpoint = function(){
        return [(this.from.x + this.to.x)/2, (this.from.y + this.to.y)/2]
    }
    
    this.groupName = function(){
        var a = this.from.id, b = this.to.id
        var c = (a <= b)
        return (c ? a : b) + "," + (c ? b : a)
    }
    
    this.attach()
}