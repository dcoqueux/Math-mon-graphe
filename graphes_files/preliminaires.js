// GRAPH JS : Preliminaires =============================================================

// Variables types
var nb        = "number",
    str       = "string",
    obj       = "object",
    bool      = "boolean",
    undef     = "undefined"

var uimode    = 0,
    dragging  = false, 
    moved     = false, 
    tmp_edge  = [null, null], 
    dontclick = false,
    selected  = [],
    hovered   = null,
    modal     = null

var touch     = "createTouch" in document
var click     = touch ? "tap" : "click"
var elt_id    = 1

var graph     = null

var canvas_elt = null,
    canvas     = null,
    context    = null

// Données de l'interface utilisateur
var ui = { 
    properties: null,
    elements: null
}


// Constantes ---------------------------------------------------------------------------


var GJ_TOOL_SELECT          = 0, // Mode manipulation du graphe
    GJ_TOOL_ADD_EDGE        = 1, // Mode ajout de noeud
    GJ_TOOL_ADD_VERTEX      = 2, // Mode ajout d'arête
    GJ_TOOL_SELECT_VERTEX   = 3, // Mode sélection d'arête
    GJ_TOOL_SELECT_EDGE     = 4 // Mode sélection de noeud

var RAYON_NOEUD = 15
var EDGE_SPACE = 150


// Style -------------------------------------------------------------------------------


function ElementStyle(strokecolor, fillcolor, strokewidth){
    if(typeof strokewidth  != nb || strokewidth  <= 0){ strokewidth  = 1.2 }

    //this.id           = ++elt_id
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


// Gestion des fenêtres modales ---------------------------------------------------------

$(document).ready(function() {

    $('[data-toggle="tooltip"]').tooltip();

    // Clic sur le bouton de validation du nom du noeud dans le modal création
    $(" #createVertex ").on("click", function() {
        var v = graph.addVertex(
            [parseInt($("#vertexX").val()), parseInt($("#vertexY").val())], $("#vertexName").val())

        if( $("#vertexautocomplete").is(":checked") ) { 
            graph.semiComplete(v) // Ne fonctionne pas. TODO : A corriger
            updateState(false)
        } else {
            clearUimode()
        }

        $(" #vertexName ").val('')
        $( "#modalCreationVertex" ).modal('hide');
    });

    // Touche entrée --> validation du nom du noeud
    $(" #vertexName ").on("keypress", function(args) {
        if (args.keyCode == 13 && $(" #modalCreationVertex ").hasClass('in')) {
            $(" #createVertex ").click();
        }
    });

    // Activer ou désactiver l'orientation du graphe
    $(document).on("click", "#btn-oriente", function() {
        graph.directed = !graph.directed;
        updateState();
    });

    // Modales d'aide
    $(document).on("click", "#kesako-matrice", function() { $(" #modalKesakoMatrice ").modal('show') });
    $(document).on("click", "#kesako-marche", function() { $(" #modalKesakoMarche ").modal('show') });
    $(document).on("click", "#kesako-djikstra", function() { $(" #modalKesakoDjikstra ").modal('show') });
})

// Fonctions utiles ---------------------------------------------------------------------


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
function trimArray(array) { 
    var a = []; 
    for (var e = 0; e < array.length; e++) { 
        if(typeof array[e] != undef){ 
            a.push(array[e]) 
        } 
    } 
    return a 
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