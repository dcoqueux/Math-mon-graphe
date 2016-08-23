// GRAPH JS : Main ===============================================================================================

$(document).ready(function(){
    
    // Variables
    canvas_elt = $("canvas")
    canvas     = canvas_elt.get(0)
    context    = canvas.getContext("2d")
    context.scale(1, 1)
    
    // Toolbox : Section applicative de la page en bas du canvas
    uiToolbox = $("#info")
    
    // Example
    new Graph();
    // coordonnées du nouveau noeud
    n1 = graph.addVertex([150, 175], "1")
    n2 = graph.addVertex([300, 50], "2")
    n3 = graph.addVertex([300, 300], "3")
    n4 = graph.addVertex([450, 175], "4")
    // [[1, 2], [2, 4], [1, 3], [3, 4], [2, 3]]
    graph.addEdge([n1, n2], 0.25)
    graph.addEdge([n2, n4], 0.50)
    graph.addEdge([n1, n3], 0.40)
    graph.addEdge([n3, n4], 0.61)
    graph.addEdge([n2, n3], 0.12)
    
    // ===== Ecoute d'evenements clic à la souris =====

    // Sur le canvas
    canvas_elt.mousemove(canvasMove)
    canvas_elt.click(canvasClick)
    // Drag and drop
    canvas_elt.mousedown( function(){ dragging = true }  )
    canvas_elt.mouseup( function(){ dragging = false; updateState() } )
    // Touche clavier
    $(document).keydown(canvasKey)
    
    // ===== Ecoute d'evenements touch sur ecran tactile =====

    if(touch){
        document.body.addEventListener("touchstart", touchStart, false)
        document.body.addEventListener("touchmove", touchMove, false)
        document.body.addEventListener("touchend", touchEnd, false)
        document.body.addEventListener("gesturechanged", noevt, false)
    }
    
    // ===== Actions des boutons de la barre d'outils =====

    $( "#btnselect" ).click(function(){ clearUimode() })
    $( "#btnaddvertex" ).click(function(){ startAddVertex() })
    $( "#btnaddedge" ).click(function(){ startAddEdge() })

    $( "#btnload"  ).click(function(){ $(" #modalLoadGraph ").modal('show') })
    $( "#btnsave"  ).click(function(){ saveGraphToJSON() })
    $( "#btnclear" ).click(function(){ clearCanvas() })

    $( "#btninfo"  ).click(function(){ displayToolbox(TOOLBOX_INFO) })
    $( "#btnmatrice" ).click(function(){ displayToolbox(TOOLBOX_MATRICE_ADJACENCE) })
    $( "#btnmarche" ).click(function(){ displayToolbox(TOOLBOX_MARCHE_ALEATOIRE) })
    $( "#btndijkstra" ).click(function(){ displayToolbox(TOOLBOX_ALGORITHME_DIJKSTRA) })
    
    // Resize
    $(window).resize(function() {
        displayToolbox(TOOLBOX_INFO);
        updateState();
    })
    
    // Let's go!
    updateState()
    updateToolbox()
})