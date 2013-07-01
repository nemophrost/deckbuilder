var Card = function(id, data) {
	this.id = id;
	this.data = data;
	var deepClone = function(data) {
		var ret = _.clone(data);
		_.each(data, function(val, key) {
			if (_.isArray(val) || _.isObject(val)) {
				ret[key] = deepClone(val);
			}
		});
		return ret;
	};
	this._initialData = deepClone(data);
};

Card.prototype.updateData = function(data) {
	// data.id = (data.id === undefined ? this.data.id : data.id);
	this.data = data;
};

Card.prototype.serialize = function(forCSV) {
	var ret = _.clone(this.data);
	ret.id = ret.id === undefined ? this.id : ret.id;

	if (forCSV) {
		_.each(ret, function(val, key) {
			if (_.isArray(val))
				ret[key] = '[' + val.join(',') + ']';
		});
	}

	return ret;
};

Card.deserialize = function(data, idx) {
	var id = (data.id === undefined ? (idx === undefined ? _.uniqueId() : idx) : data.id);
	return new Card(id, data);
};