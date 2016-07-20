// GRAPH JS : Preliminaires ======================================================================================

// Variables types
var nb         = "number",
    str        = "string",
    obj        = "object",
    bool       = "boolean",
    undef      = "undefined"

var uimode     = 0,
    dragging   = false, 
    moved      = false, 
    tmp_edge   = [null, null], 
    dontclick  = false,
    hovered    = null

var touch      = "createTouch" in document
var click      = touch ? "tap" : "click"
var elt_id     = 1

var canvas_elt = null,
    canvas     = null,
    context    = null

var graph      = null
var uiToolbox  = null
var selected   = []


// Constantes ----------------------------------------------------------------------------------------------------


var GJ_TOOL_SELECT        = 0, // Mode manipulation du graphe
    GJ_TOOL_ADD_EDGE      = 1, // Mode ajout de noeud
    GJ_TOOL_ADD_VERTEX    = 2, // Mode ajout d'arête
    GJ_TOOL_SELECT_VERTEX = 3, // Mode sélection d'arête
    GJ_TOOL_SELECT_EDGE   = 4  // Mode sélection de noeud

var TOOLBOX_INFO                = 10,
    TOOLBOX_MATRICE_ADJACENCE   = 11,
    TOOLBOX_MARCHE_ALEATOIRE    = 12,
    TOOLBOX_ALGORITHME_DIJKSTRA = 13

var RAYON_NOEUD = 15
var EDGE_SPACE = 150


// Style ---------------------------------------------------------------------------------------------------------


function ElementStyle(strokecolor, fillcolor, strokewidth){
    if(typeof strokewidth  != nb || strokewidth  <= 0){ strokewidth  = 1.2 }

    this.shape        = "circle"
    this.strokecolor  = strokecolor
    this.fillcolor    = fillcolor
    this.strokewidth  = strokewidth
    this.vertexradius = RAYON_NOEUD
}

function styleContext(style, fill){
    if(typeof fill != bool){ fill = true }
    context.strokeStyle = style.strokecolor

    if(fill){ context.fillStyle = style.fillcolor }
    context.lineWidth = style.strokewidth
}

var defaultStyle  = new ElementStyle("#000", "#fff")
var selectedStyle = new ElementStyle("rgba(39,166,255,0.5)", "transparent", 5)
var labelStyle    = new ElementStyle("transparent", "#fff", 0)


// Gestion des évènements sur les toolboxes et les fenêtres modales ----------------------------------------------

$(document).ready(function() {

    // Affiche les 'tooltips', indications lorsque le curseur survole les boutons
    $('[data-toggle="tooltip"]').tooltip();

    // Modal création de noeud : Clic sur le bouton de validation du nom du noeud dans le 
    $(" #createVertex ").on("click", function() {
        var v = graph.addVertex(
            [parseInt($("#vertexX").val()), parseInt($("#vertexY").val())], $("#vertexName").val())

        dlog($("#vertexautocomplete").is(":checked"))
        if( $("#vertexautocomplete").is(":checked") ) { 
            graph.semiComplete(v) // Ne fonctionne pas. TODO : A corriger
        }

        clearUimode()
        $(" #vertexName ").val('')
        $( "#modalCreationVertex" ).modal('hide');
    });

    // Modal chargement de graphe : Clic sur le bouton de chargement dans le menu en haut de page
    $(" #loadGraph ").on("click", function() {
        loadGraphFromJSON($(" #json-area-import ").val());
        $( "#modalLoadGraph" ).modal('hide');
        $(" #json-area-import ").val('');
    });

    // Toutes les modales : Validation du formulaire de la fenêtre modale à l'appui de la touche "Entrée"
    $(document).on("keypress", function(args) {
        if (args.keyCode == 13) {
            if ($(" #modalCreationVertex ").hasClass('in')) {
                $(" #createVertex ").click();
            } else if ($(" #modalSuppression ").hasClass('in')) {
                $(" #confirmSuppr ").click();
            }
        }
    });

    // Toutes les modales : Fermer une fenêtre modale à l'appui de la touche "Echap"
    $(document).on("keyup", function(args) {
        if (args.keyCode == 27 && $(" .modal ").hasClass('in')) {
            $(" .in ").modal('hide');
        }
    });

    // Infobox : Activer ou désactiver l'orientation du graphe
    $(document).on("click", "#btn-oriente", function() {
        graph.directed = !graph.directed;
        updateState();
    });

    // Infobox : Demande de suppression d'un élément du graphe
    $(document).on("click", ".removebtn", function() {
        $(" #modalSuppression ").modal('show');
    });

    // Confirme la suppression d'un élément du graphe
    $(" #confirmSuppr ").on("click", function() {
        removeSelection();
        $(" #modalSuppression ").modal('hide');
    });

    // Toolbox matrice adjacence : recalcul de la matrice à la modification de la longueur des chemins
    $(" #path-length ").on("change", matriceAdjacence);

    // Toolbox algorithme Dijkstra : exécution de l'algorithme
    $(" #launchDijkstra ").on("click", function() {
        selection = trimArray(selected)

        if (graph.allEdgesWeighted() && selection.length == 1 && selection[0] instanceof Vertex) {
            algoDijkstra(selection[0]);
        }
        else {
            //$(".alert").show();
        }
    });

    // Toolbox marche aléatoire : réinitialisation des valeurs
    $(" #restartMarche ").on("click", function() {
        $(" #currentStep ").val(0);

        for (var i = 0; i < graph.vertices.length; i++) {
            graph.vertices[i].weigh = 0;
        }

        updateState();
    });

    // Toolbox marche aléatoire : lancer une marche aléatoire
    $(" .launchMarche ").on("click", function() {
        simuleMarche($(this).attr('id'));
    });

    // Modales d'aide
    $(document).on("click", "#kesako-matrice", function() { $(" #modalKesakoMatrice ").modal('show') });
    $(document).on("click", "#kesako-marche", function() { $(" #modalKesakoMarche ").modal('show') });
    $(document).on("click", "#kesako-dijkstra", function() { $(" #modalKesakoDijkstra ").modal('show') });
})

// Fonctions utiles ----------------------------------------------------------------------------------------------


function is_undefined(x){ 
    return typeof x == undef
}

// Afficher un log. A UTILISER POUR LE DEBUG
function dlog(x){ 
    if("console" in window && window.console.log) { 
        console.log(x) 
    }
}
function oc(a){ 
    var o = {}; 
    for (var i = 0; i < a.length; i++) { 
        o[a[i]] = ""; 
    } 
    return o 
}

// Special HTML chars encode
function he(str){ 
    return str.toString().replace(/&/g, "&amp;")
                         .replace(/"/g, "&quot;")
                         .replace(/'/g, "&#039;")
                         .replace(/</g, "&lt;")
                         .replace(/>/g, "&gt;") 
}
function re(str){ 
    return str.toString().replace(/&quot;/g, "\"")
                         .replace(/&#039;/, "'")
                         .replace(/&lt;/g, "<")
                         .replace(/&gt;/g, ">")
                         .replace(/&amp;/g, "&") 
}

// Upper case first letter
function ucf(str){ 
    str += ""; 
    var f = str.charAt(0).toUpperCase(); 
    return f + str.substr(1) 
}

// Kudos, PHPJS
function is_numeric(mixed_var) { 
    return (typeof(mixed_var) == nb || typeof(mixed_var) == str) && mixed_var !== '' && !isNaN(mixed_var); 
}

// Supprime les undefined d'un tableau
function trimArray(array) { 
    var a = []; 
    for (var e = 0; e < array.length; e++) { 
        if(typeof array[e] != undef){ 
            a.push(array[e]) 
        } 
    } 
    return a 
}

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

// Annuler l'evenement
function noevt(evt){ 
    evt.preventDefault()
}

function inArray(obj, tab){
    for (var i = 0; i < tab.length; i++) {
        if(tab[i] === obj){
            return true
        }
    }
    return false
}

function listRemove(list, val){
    for (var i = 0; i < list.length; i++) {
        if(list[i] == val){
            list.splice(i, 1)
        }
    }
}