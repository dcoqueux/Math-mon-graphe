htmlMessages = {
    nvNoeud : '<button id="cancelVertex" class="btn btn-sm btn-danger infoboxbtn">Annuler</button><h2>Nouveau noeud</h2>' +
        '<p>Cliquez n\'importe où sur le canvas pour placer un noeud. Raccourci clavier pour la création : Clic sur le canvas en maintenant la touche "Alt" pressé</p>' +
        '<p><span><input type="checkbox" id="vertexautocomplete"><label for="vertexautocomplete">Lier le nouveau noeuds à tous les autres</label></span></p>',
    nvlArete : '<button id="cancelEdge" class="btn btn-sm btn-danger infoboxbtn">Annuler</button><h2>Nouvelle arête / Nouvel arc</h2>' +
        '<p>Cliquez sur deux noeuds à lier par une nouvelle arête / nouvel arc. Raccourci clavier pour la création : Maintenir les touches "Alt" et "Shift" enfoncées et sélectionner 2 noeuds.</p>',
    multiselection : '<button class="btn btn-sm btn-danger infoboxbtn">Supprimer sélection</button><h2>Multiselection</h2>',
    listeNoeudsHead : '<li class="h">Noeuds</li>',
    listeAretesHead : '<li class="h">Arêtes</li>'
}

var formatEdgeName = function(from, to) {
    if (graph.directed) {
        return "Arc [" + from + " -> " + to + "]";
    } else {
        return "Arête (" + from + ", " + to + ")";
    }
}

var formatInfoboxVertex = function(noeud) {
    return '<div>' +
        '<div class="row">' +
            '<div class="col-xs-4"><h2>Noeud ' + he(noeud.value) + '</h2></div>' +
            '<div class="col-xs-8"><button class="btn btn-sm btn-danger removebtn pull-right">Supprimer noeud</button></div>' +
        '</div>' +
        '<div class="row">' +
            '<div class="input-group col-xs-6">' +
                '<span class="input-group-addon" id="basic-addon1">Nom : </span>' +
                '<input type="text" class="form-control" id="label" value="' + he(noeud.value) + '">' +
            '</div>' +
            '<div class="input-group col-xs-6"">' +
                '<span class="input-group-addon" id="basic-addon1">Degré : </span>' +
                '<input type="text" class="form-control" value="' + he(noeud.getDegree()) + '" readonly>' +
            '</div>' +
        '</div>' +
    '</div>'
}

var formatInfoboxEdge = function(arete) {
    return '<div>' +
        '<div class="row">' +
            '<div class="col-xs-4"><h2>' + formatEdgeName(he(arete.from.value), he(arete.to.value)) + '</h2></div>' +
            '<div class="col-xs-8"><div class="btn-group btn-group-sm pull-right">' +
                '<button class="btn btn-warning contractbtn" title="Fusionne les noeuds liés par l\'arête">Contracter arête</button>' +
                '<button class="btn btn-danger removebtn">Supprimer arête</button>' +
            '</div></div>' +
        '</div>' +
        '<div class="row">' +
            '<div class="input-group col-xs-12">' +
                '<span class="input-group-addon" id="basic-addon1">Poids : </span>' +
                '<input type="text" id="label" value="' + he(arete.value) + '" class="form-control">' +
            '</div>' +
        '</div>' +
    '</div>'
}

var formatInfoboxGraph = function() {
    return '<div class="row">'+
            '<div class="col-xs-6"><h2>Graphe</h2></div>' +
            '<div class="col-xs-6"><button class="btn btn-sm btn-success adjustbtn pull-right" title="Replace les noeuds dans le canvas">Réajuster graphe</button></div>' +
        '</div><div class="row">' +
            '<div class="col-xs-12">' +
                '<table class="table table-bordered table-sm">' +
                    '<thead class="thead-inverse">' +
                        '<tr>' +
                            '<th width="20%">Orienté</th>' +
                            '<th width="20%">Nombre de noeuds</th>' +
                            '<th width="20%">Nombre d\'arêtes</th>' +
                            '<th width="20%">Complet</th>' +
                            '<th width="20%">Existence chaines eulériennes</th>' +
                        '</tr>' +
                    '</thead>' +
                    '<tbody>' +
                        '<tr>' +
                            '<td><a href="javascript://" id="btn-oriente" class="btn btn-primary btn-sm">' + (graph.directed ? "Oui" : "Non") + '</a></td>' +
                            '<td>' + graph.vertices.length + '</td>' +
                            '<td>' + graph.edges.length + '</td>' +
                            '<td>' + (graph.isComplete() ? "Oui" : "Non") + '</td>' +
                            '<td>' + (graph.hasEulerianChains() ? "Oui" : "Non") + '</td>' +
                        '</tr>' +
                    '</tbody>' +
                '</table>' +
            '</div>' +
        '</div>'
}

var formatVerticesList = function() {
    var list = htmlMessages.listeNoeudsHead;
    var elt;

    for(var i in graph.vertices){
        elt = graph.vertices[i]
        list += '<li id="vertex-' + i + '"' +
            (inArray(elt, selected) ? ' class="selected"' : '') + '>' +
            '<a href="javascript://">Noeud ' + he(elt.value) + '</a></li>'
    }

    return list;
}

var formatEdgesList = function() {
    var list = htmlMessages.listeAretesHead;
    var elt;

    for(var i in graph.edges){
        elt = graph.edges[i]
        list += '<li id="edge-' + i + '"' + (inArray(elt, selected) ? ' class="selected"' : '') + '>'
            + '<a href="javascript://">' + formatEdgeName(he(elt.from.value), he(elt.to.value))
            + (elt.value != "" ? ' (Poids : ' + he(elt.value) + ')' : '')
            + '</a></li>'
    }

    return list;
}

var formatAdjMatrix = function(matrice) {
    var tab = '<table class="table table-bordered table-sm"><thead class="thead-inverse">' +
        '<tr><th width="10%">De </th><th width="5%">Vers</th>'
    
    for (var i = 0; i < graph.vertices.length; i++) {
        tab += '<th>' + graph.vertices[i].value + '</th>'
    }

    tab += '<th width="5%"></th></tr></thead><tbody>'

    for (var i = 0; i < graph.vertices.length; i++) {
        tab += '<tr><th class="table-inverse">' + graph.vertices[i].value + '</th>'

        if (i == 0) {
            tab += '<td rowspan="' + graph.vertices.length + '">' +
                '<img src="./graphes_files/parenthese-ouvrante.svg" height="' + graph.vertices.length * 30 + '"></td>'
        }

        for (var j = 0; j < graph.vertices.length; j++) {
            tab += '<td>' + matrice[i][j] + '</td>'
        }

        if (i == 0) {
            tab += '<td rowspan="' + graph.vertices.length + '">' +
                '<img src="./graphes_files/parenthese-fermante.svg" height="' + graph.vertices.length * 30 + '"></td>'
        }

        tab += '</tr>'
    }

    tab += '</tbody></table>'
    return tab;
}