var Deck = function(name, cards) {
	this.name = name;
	this.cards = cards;
};

Deck.prototype.serialize = function(forCSV) {
	var ret = {};
	ret.cards = _.map(this.cards, function(card) {
		return card.serialize(forCSV);
	});
	if (forCSV)
		ret = ret.cards;
	return ret;
};

Deck.deserialize = function(data, name) {
	return new Deck(
		name,
		_.map(data.cards, function(one, idx) {
			return Card.deserialize(one, idx);
		})
	);
};

var DeckSet = function(decks) {
	this.decks = decks || {};
};

DeckSet.prototype.updateDeckFromCSV = function(deckName, data) {
	var cards = _.map(data, function(card, idx) {
		_.each(card, function(datum, key) {
			if (datum.match(/^\[.+\]$/)) {
				card[key] = datum.substring(1, datum.length - 1).split(',');
			}
			else {
				try {
					card[key] = JSON.parse(datum);
				}
				catch(er) {}
			}
		});
		return Card.deserialize(card, idx);
	});

	if (this.decks[deckName])
		this.decks[deckName].cards = cards;
	else
		this.decks[deckName] = new Deck(deckName, cards);

	return this.decks[deckName];
};

DeckSet.prototype.save = function() {
	if (window.JSON)
		localStorage.decks = JSON.stringify(this.serialize());
};

DeckSet.prototype.getActiveDeck = function() {
	var activeDeck = localStorage.activeDeck;

	if (activeDeck && this.decks[activeDeck])
		return this.decks[activeDeck];
	else
		for (var key in this.decks)
			return this.setActiveDeck(this.decks[key]);

	return null;
};

DeckSet.prototype.setActiveDeck = function(deck) {
	localStorage.activeDeck = deck.name;
	return deck;
};

DeckSet.prototype.getTree = function() {
	var ret = {};
	_.each(this.decks, function(deck, name) {
		var node = ret;
		_.each(name.split('.'), function(part, i, nameparts) {
			if (!node[part])
				node[part] = {
					'__name__': nameparts.slice(0, i + 1).join('.')
				};

			node = node[part];
		});
	});
	return ret;
};

DeckSet.prototype.getSelectInput = function() {
	var select = $('<select></select>');

	var addOption = function(node, subname) {
		var name = node['__name__'];
		if (name)
			$('<option>' + _.escape(name) + '</option>').prop('value', name).appendTo(select);

		_.each(node, addOption);
	};

	_.each(this.getTree(), addOption);
	return select;
};

DeckSet.prototype.serialize = function(forCSV) {
	var ret = {};
	_.each(this.decks, function(deck, name) {
		ret[name] = deck.serialize(forCSV);
	});
	return ret;
};

DeckSet.deserialize = function(data) {
	var decks = {};
	_.each(data, function(deckData, name) {
		decks[name] = Deck.deserialize(deckData, name);
	});
	return new DeckSet(decks);
};

DeckSet.load = function() {
	var decks = new DeckSet();
	if (localStorage.decks && window.JSON) {
		try { decks = DeckSet.deserialize(JSON.parse(localStorage.decks)); }
		catch(er) {}
	}
	return decks;
};

// var sampleObj = {
// 	'foo.bar': {
// 		__cards__: ['...']
// 	}
// }

// var sampleObj2 = {
// 	foo: {
// 		bar: {
// 			name: 'bar',
// 			__cards__: ['...']
// 		}
// 	}
// };
