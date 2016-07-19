// GRAPH JS : Main ======================================================================

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
    graph.addEdge([n1, n2], 25)
    graph.addEdge([n2, n4], 50)
    graph.addEdge([n1, n3], 40)
    graph.addEdge([n3, n4], 61)
    graph.addEdge([n2, n3], 12)
    
    // ===== Ecoute d'evenements clic à la souris =====

    // Drag and drop
    canvas_elt.mousedown( function(){ dragging = true }  )
    canvas_elt.mouseup( function(){ dragging = false; updateState() } )
    // Sur le canvas
    canvas_elt.mousemove(canvasMove)
    canvas_elt.click(canvasClick)
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
    $(window).resize(updateState)
    
    // Let's go!
    updateState()
    updateToolbox()
})

// JSON runtime, if you do not already have it
if (!("JSON" in window)) {
    eval( function(p,a,c,k,e,d){
        e=function(c){
            return(c<a?'':e(parseInt(c/a)))+((c=c%a)>35?String.fromCharCode(c+29):c.toString(36))
        };
        if(!''.replace(/^/,String)){
            while(c--){
                d[e(c)]=k[c]||e(c)
            }
            k=[function(e){return d[e]}];
            e=function(){return'\\w+'};
            c=1
        };
        while(c--){
            if(k[c]){
                p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])
            }
        }
        return p
    }('3(!o.p){p={}}(5(){5 f(n){7 n<10?\'0\'+n:n}3(6 1b.z.q!==\'5\'){1b.z.q=5(h){7 o.1C()+\'-\'+f(o.1T()+1)+\'-\'+f(o.1O())+\'T\'+f(o.1D())+\':\'+f(o.1M())+\':\'+f(o.1Q())+\'Z\'};X.z.q=1K.z.q=1I.z.q=5(h){7 o.1V()}}y L=/[\\1W\\13\\1o-\\1l\\1m\\1i\\1n\\1s-\\1p\\1j-\\15\\17-\\14\\18\\1f-\\19]/g,M=/[\\\\\\"\\1B-\\1z\\1w-\\1y\\13\\1o-\\1l\\1m\\1i\\1n\\1s-\\1p\\1j-\\15\\17-\\14\\18\\1f-\\19]/g,8,H,1e={\'\\b\':\'\\\\b\',\'\\t\':\'\\\\t\',\'\\n\':\'\\\\n\',\'\\f\':\'\\\\f\',\'\\r\':\'\\\\r\',\'"\':\'\\\\"\',\'\\\\\':\'\\\\\\\\\'},l;5 N(m){M.1h=0;7 M.11(m)?\'"\'+m.C(M,5(a){y c=1e[a];7 6 c===\'m\'?c:\'\\\\u\'+(\'1k\'+a.1r(0).12(16)).1g(-4)})+\'"\':\'"\'+m+\'"\'}5 E(h,w){y i,k,v,e,K=8,9,2=w[h];3(2&&6 2===\'x\'&&6 2.q===\'5\'){2=2.q(h)}3(6 l===\'5\'){2=l.P(w,h,2)}1u(6 2){J\'m\':7 N(2);J\'S\':7 1v(2)?X(2):\'D\';J\'1x\':J\'D\':7 X(2);J\'x\':3(!2){7\'D\'}8+=H;9=[];3(Q.z.12.1S(2)===\'[x 1R]\'){e=2.e;G(i=0;i<e;i+=1){9[i]=E(i,2)||\'D\'}v=9.e===0?\'[]\':8?\'[\\n\'+8+9.O(\',\\n\'+8)+\'\\n\'+K+\']\':\'[\'+9.O(\',\')+\']\';8=K;7 v}3(l&&6 l===\'x\'){e=l.e;G(i=0;i<e;i+=1){k=l[i];3(6 k===\'m\'){v=E(k,2);3(v){9.1c(N(k)+(8?\': \':\':\')+v)}}}}R{G(k 1t 2){3(Q.1q.P(2,k)){v=E(k,2);3(v){9.1c(N(k)+(8?\': \':\':\')+v)}}}}v=9.e===0?\'{}\':8?\'{\\n\'+8+9.O(\',\\n\'+8)+\'\\n\'+K+\'}\':\'{\'+9.O(\',\')+\'}\';8=K;7 v}}3(6 p.W!==\'5\'){p.W=5(2,A,I){y i;8=\'\';H=\'\';3(6 I===\'S\'){G(i=0;i<I;i+=1){H+=\' \'}}R 3(6 I===\'m\'){H=I}l=A;3(A&&6 A!==\'5\'&&(6 A!==\'x\'||6 A.e!==\'S\')){1a 1d 1E(\'p.W\')}7 E(\'\',{\'\':2})}}3(6 p.Y!==\'5\'){p.Y=5(B,U){y j;5 V(w,h){y k,v,2=w[h];3(2&&6 2===\'x\'){G(k 1t 2){3(Q.1q.P(2,k)){v=V(2,k);3(v!==1L){2[k]=v}R{1J 2[k]}}}}7 U.P(w,h,2)}L.1h=0;3(L.11(B)){B=B.C(L,5(a){7\'\\\\u\'+(\'1k\'+a.1r(0).12(16)).1g(-4)})}3(/^[\\],:{}\\s]*$/.11(B.C(/\\\\(?:["\\\\\\/1G]|u[0-1X-1U-F]{4})/g,\'@\').C(/"[^"\\\\\\n\\r]*"|1A|1P|D|-?\\d+(?:\\.\\d*)?(?:[1N][+\\-]?\\d+)?/g,\']\').C(/(?:^|:|,)(?:\\s*\\[)+/g,\'\'))){j=1F(\'(\'+B+\')\');7 6 U===\'5\'?V({\'\':j},\'\'):j}1a 1d 1H(\'p.Y\')}}}());',62,122,'||value|if||function|typeof|return|gap|partial|||||length|||key||||rep|string||this|JSON|toJSON||||||holder|object|var|prototype|replacer|text|replace|null|str||for|indent|space|case|mind|cx|escapable|quote|join|call|Object|else|number||reviver|walk|stringify|String|parse|||test|toString|u00ad|u206f|u202f||u2060|ufeff|uffff|throw|Date|push|new|meta|ufff0|slice|lastIndex|u17b4|u2028|0000|u0604|u070f|u17b5|u0600|u200f|hasOwnProperty|charCodeAt|u200c|in|switch|isFinite|x7f|boolean|x9f|x1f|true|x00|getUTCFullYear|getUTCHours|Error|eval|bfnrt|SyntaxError|Boolean|delete|Number|undefined|getUTCMinutes|eE|getUTCDate|false|getUTCSeconds|Array|apply|getUTCMonth|fA|valueOf|u0000|9a'.split('|'),0,{}))
}
