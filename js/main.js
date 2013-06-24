$(function() {
// versioning (view and revert?) version number on card, csv import, export, print only changed, printing, versioning based on last time printed or save dialog

var exportCSVButton = $('#exportCSV'),
	importCSVButton = $('#importCSV'),
	downloadCSVLink = $('#downloadCSV').hide(),
	importExportModal = $('#importExport'),
	exportTextArea = $('#exportTA'),
	cardViewContainer = $('#cardViews'),
	templateArea = $('#template'),
	dropTarget = $('#dropTarget');

var decks = DeckSet.load();

var template = $.trim(templateArea.get(0).innerHTML);
templateArea.empty();

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
			decks.save();
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
			decks.save();

			createCardDom(card).insertAfter(cardDom);
			cardDom.remove();
		});
	});

	// loop over a delimited list of values for a key
	// NOTE: this must be last as it removes the original dom element
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
						decks.save();
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

var loadDeck = function(deck) {
	if (!deck)
		return;

	decks.setActiveDeck(deck);

	cardViewContainer.empty();
	_.each(deck.cards, function(card) {
		createCardDom(card.data).appendTo(cardViewContainer);
	});
};

loadDeck(decks.getActiveDeck());

/* CSV EXPORT
=========================================================================== */
exportCSVButton.click(function() {
	$(this).hide();
	var deck = decks.getActiveDeck();
	if (!deck)
		return;

	downloadCSVLink.show().attr({ href: 'data:application/octet-stream,' + encodeURIComponent(objectsToCSV(deck.serialize(true))), download: deck.name + '.csv' });
	// hiddenIframe.get(0).src = 'data:application/octet-stream,' + encodeURIComponent(objectsToCSV(deck));

	// importExportModal.show();
	// exportTextArea.val(objectsToCSV(deck));

	// alert(objectsToCSV(deck) == objectsToCSV($.csv.toObjects(objectsToCSV(deck))));

	// $(document).bind('keydown.modal', function(e) {
	// 	if (e.keyCode == 27) {
	// 		$(document).unbind('keydown.modal');
	// 		importExportModal.hide();
	// 	}
	// });
});

downloadCSVLink.click(function() {
	$(this).hide();
	exportCSVButton.show();
});

/* DRAG AND DROP CSV IMPORT
=========================================================================== */
function importCSVData(fileName, dataString) {
	try {
		var data = $.csv.toObjects(dataString);
		fileName = fileName.toLowerCase().split('.');
		fileName.pop();
		var deck = decks.updateDeckFromCSV(fileName.join('.'), data);
		decks.save();
		loadDeck(deck);
	}
	catch(er) {}
}

var dragLeaveTimer;
function handleDragOver(e) {
	e.stopPropagation();
	e.preventDefault();
	dropTarget.show();

	if (dragLeaveTimer)
		clearTimeout(dragLeaveTimer);
}

function handleDragLeave(e) {
	e.stopPropagation();
	e.preventDefault();
	dragLeaveTimer = setTimeout(function() {
		dropTarget.hide();
	}, 100);
}

function handleFileSelect(e) {
	e.stopPropagation();
	e.preventDefault();

	dropTarget.hide();

	_.each(e.dataTransfer.files, function(f) {
		if (f.type.toLowerCase().indexOf('csv') == -1)
			return;

		var reader = new FileReader();

		// Closure to capture the file information.
		reader.onload = function(e) {
			importCSVData(f.name, e.target.result);
		};

		// Read in the image file as a data URL.
		reader.readAsText(f);
	});
}

// Setup the dnd listeners.
window.addEventListener('dragover', handleDragOver, false);
window.addEventListener('dragleave', handleDragLeave, false);
window.addEventListener('drop', handleFileSelect, false);

});

function objectsToCSV(objs) {
	if (!_)
		throw new Error('objectsToCSV requires underscore to be loaded.');

	// get all the keys for the column labels of the CSV
	var ret = [],
		keyMap = {},
		columns = 0,
		format = function(obj) {
			if (!_.isString(obj))
				obj = JSON.stringify(obj);

			if (obj.search(/[\n\r,"]/g) > -1) {
				obj = '"' + obj.replace(/"/g, '""') + '"';
			}

			return obj;
		};

	_.forEach(objs, function(obj) {
		_.forEach(obj, function(val, key) {
			if (keyMap[key] === undefined) {
				keyMap[key] = columns;
				columns++;
			}
		});
	});

	var header = new Array(columns);
	_.forEach(keyMap, function(column, label) {
		header[column] = format(label);
	});
	ret.push(header.join(','));

	_.forEach(objs, function(obj) {
		var row = new Array(columns);
		_.forEach(obj, function(val, key) {
			row[keyMap[key]] = format(val);
		});
		ret.push(row.join(','));
	});

	return ret.join('\r\n');
}
