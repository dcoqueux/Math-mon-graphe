htmlMessages = {
    nvNoeud : '<h2>Nouveau noeud</h2><p>Cliquer n\'importe où sur le canvas pour placer un noeud. <button id="cancelVertex" class="btn btn-sm btn-danger">Annuler</button></p>' +
        '<p><span><input type="checkbox" id="vertexautocomplete"><label for="vertexautocomplete">Lier le nouveau noeuds à tous les autres</label></span></p>',
    // TODO : Rendre fonctionnel l'hyperlien d'annulation
    nvlArete : '<h2>Nouvelle arête</h2><p>Cliquez sur deux noeuds à lier par une nouvelle arête. <button id="cancelEdge" class="btn btn-sm btn-danger">Annuler</button></p>',
    multiselection : '<button class="btn btn-sm btn-danger infoboxbtn">Supprimer sélection</button><h2>Multiselection</h2>'
                
}

var formatInfoboxVertex = function(noeud) {
    return '<div>' +
        '<button class="btn btn-sm btn-danger removebtn infoboxbtn">Supprimer noeud</button>' +
        '<h2>Noeud ' + he(noeud.value) + '</h2>' +
        '<p>' +
            '<label for="label">Nom : </label>' +
            '<input type="text" id="label" size="3" value="' + he(noeud.value) + '" autocapitalize="off">' +
        '</p>' +
        '<p class="field"><span class="i">Degré : </span>' + he(noeud.degree) + '</p>' +
    '</div>'
}

var formatInfoboxEdge = function(arete) {
    return '<div>' +
        '<div class="btn-group btn-group-sm infoboxbtn">' +
            '<button class="btn btn-warning contractbtn" title="Fusionne les noeuds liés par l\'arête">Contracter arête</button>' +
            '<button class="btn btn-danger removebtn">Supprimer arête</button>' +
        '</div>' +
        '<h2>Arête [' + he(arete.from.value) + ' -> ' + he(arete.to.value) + ']</h2>' +
        '<p>' +
            '<label for="label">Poids : </label>' +
            '<input type="text" id="label" size="3" value="' + he(arete.value) + '">' +
        '</p>' +
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
                        '<th width="25%">Nombre de noeuds</th>' +
                        '<th width="25%">Nombre d\'arêtes</th>' +
                        '<th width="25%">Complet</th>' +
                        '<th width="25%">Existence chaines eulériennes</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' +
                    '<tr>' +
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

