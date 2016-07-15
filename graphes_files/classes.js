// GRAPH JS : Classes ===================================================================

// Graphe -------------------------------------------------------------------------------

function Graph(){
    // Constructeur
    if(typeof vertices == undef){ vertices = [] }
    if(typeof vertices != obj){ return false }
    if(typeof edges == undef){ edges = [] }
    if(typeof edges != obj){ return false }

    this.vertices = []
    this.edges    = []
    this.directed = false
    
    // ===== Constructeur et destructeur =====

    this.attach = function(){ graph = this; }
    this.detach = function(){ graph = null; }

    // ===== ======
    
    this.addVertex = function(v, value){
        if (v instanceof Array && v.length == 2) {
            v = new Vertex(elt_id++, value, v[0], v[1])
            this.draw(context)
            return v
        }
        else {
            return null
        }
    }
    
    this.addEdge = function(e){
        if(e instanceof Array && e.length == 2) {
            e = new Edge(elt_id++, "", e[0], e[1])
        }

        if (e instanceof Edge && inArray(e.from, this.vertices) && inArray(e.to, this.vertices)) {
            this.draw(context)
            return e
        }
        return null
    }
    
    this.draw = function() {
        // Dessin des arêtes
        // Groupes d'arêtes reliant les memes noeuds
        var edgegroups = this.edgeGroups()
        var group
        var reverse

        for (var i in edgegroups) {
            group = edgegroups[i]

            // Dessin par groupe pour les courbures si arête adjacence multiple
            for(var j in group){
                group[j].draw(group.length, j)
            }
        }

        // Dessin des noeuds
        for (var i = 0; i < this.vertices.length; i++) {
            this.vertices[i].draw()
        }
    }

    // Repositionne les noeuds dans le canvas si redimensionné
    this.readjust = function() {
        for (var i = 0; i < this.vertices.length; i++) {
            if (this.vertices[i].x > canvas.width) {
                this.vertices[i].x = canvas.width - (RAYON_NOEUD + 10)
            }

            if (this.vertices[i].y > canvas.width) {
                this.vertices[i].y = canvas.width - (RAYON_NOEUD + 10)
            }
        }
    }
    
    this.toJSON = function(){
        var o = { vertices: [], edges: [], x: this.x, y: this.y }
        for (var i = 0; i < this.vertices.length; i++) {
            o.vertices.push(this.vertices[i].toJSON())
        }
        for (var i = 0; i < this.edges.length; i++) {
            o.edges.push(this.edges[i].toJSON())
        }
        return o
    }
    
    // Liste des degrés des noeuds du graphe (TODO : a supprimer ?)
    this.degreeSeq = function(){
        var seq = [], v
        for (var i = 0; i < this.vertices.length; i++) {
            v = this.vertices[i]
            if(v instanceof Vertex){
                seq.push(v.getDegree())
            }
        }
        return seq
    }
    
    // Determine la liste des éléments du graphe dans le rectangle de sélection
    this.elementsWithinRect = function(x1, y1, x2, y2){
        var xh  = Math.max(x1, x2),
            xl  = Math.min(x1, x2),
            yh  = Math.max(y1, y2),
            yl  = Math.min(y1, y2),
            els = []
        var a

        // Vertices
        for(var i = 0; i < this.vertices.length; i++) {
            a = this.vertices[i]
            if ((xl <= a.x && a.x <= xh) && (yl <= a.y && a.y <= yh)) {
                els.push(a)
            }
        }

        // Edges
        // ????
        return els
    }

    // ===== Adjacence, matrices ... Utilise la bibliothèque sylvester =====
    
    this.adjacencyList = function(){
        var l = [], e
        for (var i = 0; i < this.edges.length; i++) {
            e = this.edges[i]
            l.push([e.from, e.to])
        }
        return l
    }
    
    /*
     *  Retourne la matrice d'adjacence du graphe
     *  mobj : détermine si la fonction retourne un tableau bi-dimensionnel ou un objet Matrix
     *  power : puissance à laquelle la matrice d'adjacence est élevée
     */
    this.adjacencyMatrix = function(mobj, puissance){
        var matrice = Matrix.Zero(this.vertices.length, this.vertices.length).elements
        var i, j

        for (var k = 0; k < this.edges.length; k++) {
            edge = this.edges[k];
            i = this.vertices.indexOf(edge.from);
            j = this.vertices.indexOf(edge.to);

            matrice[i][j]++;
            if (!this.directed)
                matrice[j][i]++;
        }

        if (typeof puissance == nb && puissance > 1 && puissance == Math.floor(puissance)) {
            return $M(matrice).power(puissance).elements;
        }

        return mobj ? $M(matrice) : matrice
    }

    /*
     *  Si le graphe est probabiliste (graphe orienté, avec arcs pondérés,
     *  et dont la somme des poids des arcs partant d'un noeud est égal à 1)
     *  la méthode retourne la matrice de transition du graphe.
     */
    this.transitionMatrix = function(mobj, puissance) {
        var n = this.vertices.length;
        var matrice = Matrix.Zero(n, n).elements;
        var i, j, k;
        var arc;
        var sommePoids;

        if (!this.allEdgesWeighted(true)) {
            return null
        }

        for (k = 0; k < this.edges.length; k++) {
            arc = this.edges[k];
            j = this.vertices.indexOf(arc.from);
            i = this.vertices.indexOf(arc.to);
            matrice[i][j] += parseFloat(arc.value);
        }

        for (j = 0; j < n; j++) {
            sommePoids = 0;
            for (i = 0; i < n; i++) {
                sommePoids += matrice[i][j];
            }

            if (sommePoids > 1) {
                return null;
            } else {
                matrice[j][j] = Number((1 - sommePoids).toFixed(5));
            }
        }

        // retourner la matrice si toutes les conditions sont vérifiées
        if (typeof puissance == nb && puissance > 1 && puissance == Math.floor(puissance)) {
            return $M(matrice).power(puissance).elements;
        }

        return mobj ? $M(matrice) : matrice;
    }
    
    this.degreeMatrix = function(mobj){
        var ds = this.degreeSeq()
        var dl = (ds.length > 0)
        var DM = dl ? Matrix.Diagonal(ds) : $M([0])
        return mobj ? DM : (dl ? DM.elements : [])
    }
    
    this.laplacianMatrix = function(mobj){
        var AM = this.adjacencyMatrix(true)
        var DM = this.degreeMatrix(true)
        var LM = DM.subtract(AM)
        return mobj ? LM : LM.elements
    }
    
    // Spanning tree : Sous-graphe sans boucle
    this.spanningTreeCount = function() {
        var LM = this.laplacianMatrix(true)
        var n  = LM.rows() - 1

        if (n > 1) {
            return Math.round(LM.minor(1, 1, n, n).determinant())
        } else if(n == 1) {
            return Math.round(Math.abs(LM.elements[0][0]))
        }

        return this.vertices.length >= 1 ? 1 : 0
    }

    // ===== =====
    
    this.edgeGroups = function(groupname){
        // un groupe d'arêtes (array) reliant 2 memes noeuds
        // est indexée dans la liste par un groupname
        var liste = {}
        var edge, name

        for (var i = 0; i < this.edges.length; i++) {
            edge = this.edges[i]
            name = edge.groupName()

            if (!(name in liste)) { 
                liste[name] = [] 
            }
            liste[name].push(edge)
        }

        // Si demandé par l'utilisateur, retourne un groupe d'arêtes
        // en particulier, sinon toute la liste
        if (groupname) {
            return (groupname in liste) ? liste[groupname] : null
        }

        return liste
    }

    this.hasEulerianChains = function() {
        oddDegrees = 0
        for (var i = 0; i < this.vertices.length; i++) {
            if (this.vertices[i].getDegree() % 2 == 1) {
                oddDegrees++
            }
        }

        return (oddDegrees == 0 || oddDegrees == 2)
    }
    
    // Graphe complet : graphe où chaque noeud est relié à tous les autres par une arête
    this.isComplete = function(){
        var groups = this.edgeGroups();
        var n = this.vertices.length;

        // Somme des arêtes = somme des entiers de 1 à n ?
        if (Object.keys(groups).length != n*(n-1)/2)
            return false;

        // Pas d'arêtes multiples
        for (var i in groups) {
            if (groups[i].length != 1)
                return false;
        }

        return true;
    }

    /*
     *  Vérifie que toutes les arêtes du graphe sont pondérées
     *  proba : booléen pour vérifier également que le poids est bien une probabilité
     */
    this.allEdgesWeighted = function(proba) {
        for (var i = 0; i < this.edges.length; i++) {
            weigh = this.edges[i].value
            if (!is_numeric(weigh)) {
                return false;
            }

            if (proba && (parseFloat(weigh) < 0 || parseFloat(weigh) > 1)) {
                return false;
            }
        }
        return true
    }
    

    /*
     *  Supprime toutes les arêtes du graphe pour refrabiquer un graphe complet.
     */
    this.complete = function(cx){
        var v1, v2;
        var i, j;
        this.edges = [];

        for (i = 0; i < this.vertices.length; i++) {
            v1 = this.vertices[i]
            v1.edges = []
        }

        for (i = 0; i < this.vertices.length; i++) {
            v1 = this.vertices[i]

            for (j = i + 1; j < this.vertices.length; j++) {
                v2 = this.vertices[j]

                if (v2 !== v1) {
                    this.addEdge([v1, v2])
                }
            }
        }
    }
    
    this.semiComplete = function(v, cx){
        dlog(["Semicomplete", v, v instanceof Vertex])
        if(v instanceof Vertex && inArray(v, this.vertices)){
            for (var j = 0; j < this.vertices; j++) {
                u = this.vertices[j]

                if(u instanceof Vertex && u !== v){
                    if(!v.isNeighbour(u)){
                        this.addEdge([v,u])
                    }
                }
            }
        }
    }
    
    this.attach()
}

// Noeud --------------------------------------------------------------------------------

function Vertex(id, value, x, y){
    // Initialisation
    if(typeof id != nb){ return false }
    if(typeof value != nb && typeof value != str){ return false }
    if(typeof x != nb || typeof y != nb){ return false }
    
    this.id     = id            // Géré par Graph
    this.value  = value         // Nom du noeud
    this.weigh  = ""            // Poids (ex : fréquence, probabilité)
    this.x      = Math.round(x) // Abscisse
    this.y      = Math.round(y) // Ordonnée
    this.edges  = []            // Arêtes ou arcs liées au noeud
    this.style  = defaultStyle
    
    // ===== Constructeur et destructeur =====

    this.attach = function(){ graph.vertices.push(this) }
    
    this.detach = function() {
        listRemove(graph.vertices, this)
        
        if (this.id in selected) { 
            delete selected[this.id]
        }

        for (var i = this.edges.length - 1; i >= 0; i--) {
            this.edges[i].detach()
        }
    }

    // ===== =====
    
    this.draw = function(){
        this._draw(this.style)
    }
    
    this.drawSel = function(){
        this._draw(selectedStyle)
    }
    
    this._draw = function(style){
        // Tracé du cercle
        styleContext(style, false)
        context.beginPath()
        context.arc(this.x, this.y, style.vertexradius, 0, 2*Math.PI, true)
        context.closePath()
        context.stroke()

        // Paramètres police
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.font = "12px Verdana"

        // Affichage du nom et du poids du noeud
        styleContext(labelStyle, false)
        context.fillText(this.value, this.x, this.y)
        context.fillText(this.weigh, this.x - (RAYON_NOEUD + 10), this.y - (RAYON_NOEUD + 10))
    }

    this.getDegree = function() {
        deg = 0

        for (var i = 0; i < this.edges.length; i++) {
            edge = this.edges[i];
            if (edge.from === this) {
                deg++;
            }
            else if (edge.to === this) {
                if (graph.directed) {
                    deg--;
                } else {
                    deg++;
                }
            } else {
                dlog(["WARNING", "arête associé à un noeud qui ne lui est pas attaché"]);
            }
        }

        return deg;
    }
    
    this.isNeighbour = function(v){
        var edge
        for (var i = 0; i < this.edges.length; i++) {
            edge = this.edges[i]
            if(
                (edge.from === this && edge.to   === v) ||
                (edge.to   === this && edge.from === v)
            ){
                return true
            }
        }
        return false
    }
    
    this.neighbours = function(){
        var n = [], e
        for (var i = 0; i < this.edges.length; i++) {
            e = this.edges[i]
            if(e.from === this){
                n.push(e.to)
            } else if(e.to === this){
                n.push(e.from)
            }
        }
        return n
    }

    this.toJSON    = function(){
        return { id: this.id, value: this.value, x: this.x, y: this.y } // No style support yet
    }
    
    this.attach()
}

// Edge (Dirigé ? Oui -> Arc / Non -> Arête) --------------------------------------------

function Edge(id, value, from, to){
    // Initialisation
    if(typeof id != nb){ return false }
    if(typeof value != nb && typeof value != str){ value = "" }
    if(typeof from != obj || typeof to != obj){ return false }
    
    this.id       = id           // Géré par Graph
    this.value    = value        // Poids de l'arête
    this.from     = from         // Noeud de départ
    this.to       = to           // Noeud d'arrivée
    this.style    = defaultStyle

    // ===== Constructeur et destructeur =====

    this.attach = function() {
        graph.edges.push(this)
        this.from.edges.push(this)
        this.to.edges.push(this)
    }
    
    this.detach = function() {
        listRemove(graph.edges, this)

        if (this.id in selected) { 
            delete selected[this.id]
        }

        listRemove(this.from.edges, this)
        listRemove(this.to.edges, this)
    }

    // ===== =====
    
    this.draw = function(total, i){
        this._draw(this.style, total, i)
    }
    
    this.drawSel = function(total, i){
        this._draw(selectedStyle, total, i)
    }
    
    /*
     * total : nb d'aretes entre deux memes noeuds
     * i : index de l'arete parmi l'ensemble des aretes communes à deux memes noeuds
     */
    this._draw   = function(style, total, i){
        if (typeof total == undef || total <= 0) { total = 1 }
        if (typeof i == undef || i < 0) { i = 0 }

        var params = computeCurveParameters(total, i, this)

        // Trace l'arc jusqu'à B en passant par alpha
        // quadraticCurve : arc courbée si arête multiple entre deux noeuds, rectiligne sinon
        
        styleContext(style, false);
        context.beginPath();
        context.moveTo(params['ax'], params['ay']);
        context.quadraticCurveTo(params['alphax'], params['alphay'], params['bx'], params['by']);
        context.stroke();
        
        // Ne fonctionne pas encore ...
        if (graph.directed) {
            var vecteurX = params['bx'] - params['alphax'];
            var vecteurY = params['by'] - params['alphay'];
            var norme = Math.sqrt(Math.pow(vecteurX, 2) + Math.pow(vecteurY, 2));

            context.fillStyle = '#000';
            context.beginPath();
            context.moveTo(params['bx'], params['by']);
            context.lineTo(params['bx'] - (vecteurX * 15 + vecteurY * 4) / norme, params['by'] - (vecteurY * 15 - vecteurX * 4) / norme);
            context.lineTo(params['bx'] - (vecteurX * 15 - vecteurY * 4) / norme, params['by'] - (vecteurY * 15 + vecteurX * 4) / norme);
            context.lineTo(params['bx'], params['by']);
            context.closePath();
            context.fill();
        }

        // Paramètres police
        context.textAlign = "center"
        context.textBaseline = "middle"
        context.font = "12px Verdana"

        // Affichage du nom et du poids du noeud
        styleContext(labelStyle, false)
        context.fillText(this.value, params['alphax'], params['alphay'])
    }
    
    // Supprime l'arête et fusionne les noeuds adjacents liés par l'arête
    // Le noeud de départ est conservé
    this.contract = function(){
        var edge
        this.detach()

        // Avant sa suppression, on récupère les arêtes du noeud
        for (var i in this.to.edges) {
            edge = this.to.edges[i]

            // Arêtes entrantes
            if(edge.to == this.to){
                edge.to = this.from
            }
            // Arêtes sortantes
            if(edge.from == this.to){
                edge.from = this.from
            }

            // Les arêtes du même groupe que celle contractante est une boucle
            // Pour l'instant, suppression
            if(edge.from == edge.to){
                edge.detach()
            }

            // Récupération après réaffectation
            this.from.edges.push(edge)
        }

        dlog(["Fusion des noeuds", this.from.value, this.to.value])
        this.to.edges = []
        this.to.detach()
        this.from.x = 0.5 * (this.from.x + this.to.x)
        this.from.y = 0.5 * (this.from.y + this.to.y)
    }
    
    this.toJSON  = function(){
        return { 
            id: this.id, 
            value: this.value, 
            from: this.from.id, 
            to: this.to.id
        }
    }
    
    // Retourne un nom de groupe pour les arêtes reliant les mêmes noeuds
    this.groupName = function(){
        var a = this.from.id, b = this.to.id
        if (a <= b) {
            return a + "," + b
        } else {
            return b + "," + a
        }
    }
    
    this.attach()
}