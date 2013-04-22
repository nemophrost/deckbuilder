$(function() {
// versioning (view and revert?) version number on card, csv import, export, print only changed, printing, versioning based on last time printed or save dialog

var deck;
if (localStorage.deck && window.JSON) {
	deck = JSON.parse(localStorage.deck);
}
else {
	deck = sampleDeck;
	if (window.JSON) {
		localStorage.deck = JSON.stringify(deck);
	}
}

var template = $.trim($('body').get(0).innerHTML);
$('body').empty();

var save = function() {
	if (window.JSON)
		localStorage.deck = JSON.stringify(deck);
};

var eachWithData = function(card, dom, attr, each) {
	dom.find('[' + attr + ']').each(function() {
		var dataSet = $(this).attr(attr).split(':');
		if (dataSet[0] in card)
			each.call(this, $(this), card[dataSet[0]], dataSet[0], dataSet.slice(1));
	});
};

var bindContent = function(dom, initialValue, onChange) {
	dom.prop('contenteditable', true);
	dom.text(initialValue);
	dom.keyup(function() {
		var newVal = dom.text();
		// strip formatting
		if (dom.html().indexOf('<') > -1)
			dom.text(newVal);

		if (onChange)
			onChange.call(dom.get(0), newVal);
	});
};

var bindClass = function(dom, classes) {
	if (!isNaN(classes))
		classes = '_' + classes;
	dom.addClass(classes);
};

var bindClickPrompt = function(dom, key, initialValue, onChange) {
	dom.click(function() {
		var newVal = prompt('New value for "' + key + '":', initialValue);
		if (newVal !== null && newVal != initialValue && onChange) {
			onChange.call(dom.get(0), newVal);
		}
	});
};

var createCardDom = function(card) {
	var cardHtml = template;
	for (var key in card) {
		cardHtml = cardHtml.replace(new RegExp('\\{\\{' + key + '\\}\\}', 'gi'), card[key]);
	}
	var cardDom = $(cardHtml);

	// content editable areas
	eachWithData(card, cardDom, 'data-content', function(dom, value, key, params) {
		bindContent(dom, value, function(newVal) {
			card[key] = newVal;
			save();
		});
	});

	// css class associations
	eachWithData(card, cardDom, 'data-class', function(dom, value, key, params) {
		bindClass(dom, value);
	});

	// click prompts
	eachWithData(card, cardDom, 'data-click-prompt', function(dom, value, key, params) {
		bindClickPrompt(dom, key, value, function(newVal) {
			card[key] = newVal;
			save();

			createCardDom(card).insertAfter(cardDom);
			cardDom.remove();
		});
	});

	// loop over a delimited list of values for a key
	// NOTE: this must be last as it removed the original dom element
	eachWithData(card, cardDom, 'data-each', function(dom, data, key, params) {
		var method = params[0] || 'content',
			delimiter = dom.attr('data-each-delimiter') || ',';
			// data = value.split(delimiter);

		_.each(data, function(val, i) {
			var clone = dom.clone();
			switch (method) {
				case 'content':
					bindContent(clone, val, function(newVal) {
						data[i] = newVal;
						card[key] = data.join(delimiter);
						save();
					});
					break;
				case 'class':
					bindClass(clone, val);
					break;
				default:
					break;
			}
			clone.insertBefore(dom);
		});

		dom.remove();
	});

	return cardDom;
};

$.each(deck, function(i, card) {
	createCardDom(card).appendTo('body');
});

});
