// GRAPH JS : Classes ===================================================================

// Graphe -------------------------------------------------------------------------------

function Graph(){
    // Initialisation
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
    
    this.addEdge = function(e, value){
        if(e instanceof Array && e.length == 2) {
            e = new Edge(elt_id++, value, e[0], e[1])
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
        var json = { vertices: [], edges: [] }

        for (var i = 0; i < this.vertices.length; i++) {
            json.vertices.push(this.vertices[i].toJSON())
        }

        for (var i = 0; i < this.edges.length; i++) {
            json.edges.push(this.edges[i].toJSON())
        }

        return json
    }
    
    // Determine la liste des sommets du graphe dans le rectangle de sélection
    // Pas besoin des arêtes, si suppression ou déplacement des sommets,
    // les arêtes seront supprimées ou déplacées avec.
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

        return els
    }

    // Retrouve un sommet par son nom (et non par son id). Si plusieurs sommets portent le même nom,
    this.getVertexByName = function(name) {
        for (var i = 0; i < this.vertices.length; i++) {
            if (this.vertices[i].value == name)
                return this.vertices[i]
        }

        return null
    }

    this.getEdge = function(from, to) {
        for (var i = 0; i < this.edges.length; i++) {
            if (this.edges[i].from === from && this.edges[i].to === to)
                return this.edges[i]
        }
    }

    // ===== Adjacence, matrices ... Utilise la bibliothèque sylvester =====
    
    /*
     *  Retourne la matrice d'adjacence du graphe
     *  returnAsObject : détermine si la fonction retourne un tableau bi-dimensionnel ou un objet Matrix
     *  power : puissance à laquelle la matrice d'adjacence est élevée
     */
    this.adjacencyMatrix = function(returnAsObject, puissance){
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

        return returnAsObject ? $M(matrice) : matrice
    }

    /*
     *  Si le graphe est probabiliste (graphe orienté, avec arcs pondérés,
     *  et dont la somme des poids des arcs partant d'un noeud est égal à 1)
     *  la méthode retourne la matrice de transition du graphe.
     */
    this.transitionMatrix = function(returnAsObject) {
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

        return returnAsObject ? $M(matrice) : matrice;
    }
    
    this.degreeMatrix = function(returnAsObject){
        var seq = []
        for (var i = 0; i < this.vertices.length; i++) {
            seq.push(this.vertices[i].getDegree())
        }

        var dl = (ds.length > 0)
        var DM = dl ? Matrix.Diagonal(seq) : $M([0])
        return returnAsObject ? DM : (dl ? DM.elements : [])
    }
    
    this.laplacianMatrix = function(returnAsObject){
        var AM = this.adjacencyMatrix(true)
        var DM = this.degreeMatrix(true)
        var LM = DM.subtract(AM)
        return returnAsObject ? LM : LM.elements
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
    
    this.semiComplete = function(v){
        dlog(["Semicomplete", v])
        if (v instanceof Vertex) {
            for (var j = 0; j < this.vertices.length; j++) {
                if (this.vertices[j] !== v)
                    this.addEdge([v, this.vertices[j]])
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
    this.style  = defaultStyle

    //  Liste d'objets de la forme: {
    //      'obj' : arête/arc partant de/arrivant à ce noeud,
    //      'linkedTo' : noeud associé à ce noeud par l'arête/arc indexé à 'obj'
    //      'isOrigin' : booléen, vrai si ce noeud est le noeud de départ, faux sinon
    //  }
    this.edges  = []
    
    // ===== Constructeur et destructeur =====

    this.attach = function(){ graph.vertices.push(this) }
    
    this.detach = function() {
        // Liste des noeuds du graphe
        listRemove(graph.vertices, this)
        
        // Liste des éléments sélectionnés
        if (this.id in selected) { 
            delete selected[this.id]
        }

        // Suppression des arêtes/arcs lié(e)s à ce noeud
        for (var i = this.edges.length - 1; i >= 0; i--) {
            this.edges[i].obj.detach()
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
        if (this.weigh != 0)
            context.fillText(this.weigh, this.x - (RAYON_NOEUD + 5), this.y - (RAYON_NOEUD + 8))
    }

    this.getDegree = function() {
        deg = 0

        for (var i = 0; i < this.edges.length; i++) {
            edgeOrigin = this.edges[i].isOrigin;

            if (edgeOrigin == null || edgeOrigin == undefined) {
                dlog(["WARNING", "origine de l'arête non définie"]);
            }
            else {
                if (edgeOrigin) { deg++; }
                else {
                    if (graph.directed) { deg--; } else { deg++; }
                }
            }
        }

        return deg;
    }
    
    // Ce noeud est-il associé au noeud v par un arc / une arête ?
    this.isNeighbour = function(v){
        for (var i = 0; i < this.edges.length; i++) {
            if (this.edges[i].linkedTo === v) {
                return true
            }
        }

        return false
    }
    
    /*
     *  Si graphe non orienté, retourne la liste des sommets adjacents à ce sommet
     *  Si graphe orienté, retourne la liste des sommets à la fin de tout arc partant de ce sommet
     */
    this.neighbours = function(){
        var neighbours = []

        for (var i = 0; i < this.edges.length; i++) {
            if (!graph.directed || this.edges[i].isOrigin)
                neighbours.push(this.edges[i].linkedTo);
        }

        return neighbours
    }

    this.toJSON = function(){
        return { value: this.value, x: this.x, y: this.y }
    }
    
    this.attach()
}

// Edge (Dirigé ? Oui -> Arc / Non -> Arête) --------------------------------------------

function Edge(id, value, from, to){
    // Initialisation
    if(typeof id != nb){ return false }
    if(typeof value != nb){ value = isNaN(value) ? 0 : parseFloat(value); }
    if(typeof from != obj || typeof to != obj){ return false }
    
    this.id       = id           // Géré par Graph
    this.value    = value        // Poids de l'arête
    this.from     = from         // Noeud de départ
    this.to       = to           // Noeud d'arrivée
    this.style    = defaultStyle

    // ===== Constructeur et destructeur =====

    this.attach = function() {
        graph.edges.push(this)
        this.from.edges.push({ 'obj': this, 'linkedTo': this.to, 'isOrigin': true })
        this.to.edges.push({ 'obj': this, 'linkedTo': this.from, 'isOrigin': false })
    }
    
    this.detach = function() {
        listRemove(graph.edges, this)

        if (this.id in selected) { 
            delete selected[this.id]
        }

        for (var i = 0; i < this.from.edges.length; i++) {
            if (this.from.edges[i].obj === this)
                this.from.edges.splice(i, 1)
        }
        for (var i = 0; i < this.to.edges.length; i++) {
            if (this.to.edges[i].obj === this)
                this.to.edges.splice(i,1)
        }
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
        if (this.value != 0)
            context.fillText(this.value, params['alphax'], params['alphay'])
    }
    
    // Supprime l'arête et fusionne les noeuds adjacents liés par l'arête
    // Le noeud d'arrivée est supprimé, tout est transféré au noeud de départ
    this.contract = function(){
        var edge, linkedNode, isOrigin
        this.detach()

        // Avant sa suppression, on récupère les arêtes du noeud
        for (var i in this.to.edges) {
            edge = this.to.edges[i].obj

            // Arêtes entrantes
            if(edge.to == this.to){
                edge.to = this.from
                linkedNode = edge.from
                isOrigin = false
            }
            // Arêtes sortantes
            if(edge.from == this.to){
                edge.from = this.from
                linkedNode = edge.to
                isOrigin = true
            }

            // Les arêtes du même groupe que celle contractante est une boucle
            // Pour l'instant, suppression
            if (edge.from == edge.to) {
                edge.detach()
            }
            else {
                // Récupération après réaffectation
                this.from.edges.push({ 'obj': edge, 'linkedTo': linkedNode, 'isOrigin' : isOrigin });
            }
        }

        dlog(["Fusion des noeuds", this.from.value, this.to.value])
        this.to.edges = []
        this.to.detach()
        this.from.x = 0.5 * (this.from.x + this.to.x)
        this.from.y = 0.5 * (this.from.y + this.to.y)
    }
    
    this.toJSON  = function(){
        return { from: this.from.value, to: this.to.value, value: this.value }
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