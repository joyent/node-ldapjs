// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

var assert = require('assert');

var asn1 = require('asn1');

var Protocol = require('./protocol');


///--- API

/**
 * @constructor
 * @param [options={}]
 */
function Attribute(options) {
  if (options) {
    if (typeof (options) !== 'object')
      throw new TypeError('options must be an object');
    if (options.type && typeof (options.type) !== 'string')
      throw new TypeError('options.type must be a string');
  } else {
    options = {};
  }

  this.type = options.type || '';
  this._vals = [];

  if (options.vals !== undefined && options.vals !== null)
    this.vals = options.vals;
}

module.exports = Attribute;

Object.defineProperties(Attribute.prototype, {

  buffers: {
    get: function () {
      var self = this;
      return self._vals;
    },
    configurable: false
  },

  json: {
    get: function() {
      var self = this;
      return {
        type: self.type,
        vals: self.vals
      };
    },
    configurable: false
  },

  vals: {
    get: function() {
      var self = this;
      var type = self.type;
      var _vals = self._vals;
      return _vals.map(function(v) {
        return v.toString(_getEncodingFromType(type));
      });
    },
    set: function(vals) {
      var self = this;
      this._vals = [];
      if (Array.isArray(vals)) {
        vals.forEach(function(v) {
          self.addValue(v);
        });
      } else {
        self.addValue(vals);
      }
    },
    configurable: false
  }

});

Attribute.prototype.addValue = function (val) {
  this._vals.push(_valueToBuffer(val, this.type));
};


/* BEGIN JSSTYLED */
Attribute.compare = function compare(a, b) {
  if (!(Attribute.isAttribute(a)) || !(Attribute.isAttribute(b))) {
    throw new TypeError('can only compare Attributes');
  }

  if (a.type < b.type) return -1;
  if (a.type > b.type) return 1;
  if (a.vals.length < b.vals.length) return -1;
  if (a.vals.length > b.vals.length) return 1;

  for (var i = 0; i < a.vals.length; i++) {
    if (a.vals[i] < b.vals[i]) return -1;
    if (a.vals[i] > b.vals[i]) return 1;
  }

  return 0;
};
/* END JSSTYLED */


Attribute.prototype.parse = function (ber) {
  assert.ok(ber);

  ber.readSequence();
  this.type = ber.readString();

  if (ber.peek() === Protocol.LBER_SET) {
    if (ber.readSequence(Protocol.LBER_SET)) {
      var end = ber.offset + ber.length;
      while (ber.offset < end)
        this._vals.push(ber.readString(asn1.Ber.OctetString, true));
    }
  }

  return true;
};


Attribute.prototype.toBer = function (ber) {
  assert.ok(ber);

  ber.startSequence();
  ber.writeString(this.type);
  ber.startSequence(Protocol.LBER_SET);
  if (this._vals.length) {
    this._vals.forEach(function (b) {
      ber.writeByte(asn1.Ber.OctetString);
      ber.writeLength(b.length);
      for (var i = 0; i < b.length; i++)
        ber.writeByte(b[i]);
    });
  } else {
    ber.writeStringArray([]);
  }
  ber.endSequence();
  ber.endSequence();

  return ber;
};


Attribute.toBer = function (attr, ber) {
  return Attribute.prototype.toBer.call(attr, ber);
};


Attribute.isAttribute = function (attr) {
  if (!attr || typeof (attr) !== 'object') {
    return false;
  }
  if (attr instanceof Attribute) {
    return true;
  }
  if ((typeof (attr.toBer) === 'function') &&
      (typeof (attr.type) === 'string') &&
      (Array.isArray(attr.vals)) &&
      (attr.vals.filter(function (item) {
         return (typeof (item) === 'string' ||
                  Buffer.isBuffer(item));
       }).length === attr.vals.length)) {
    return true;
  }
  return false;
};


Attribute.prototype.toString = function () {
  return JSON.stringify(this.json);
};

/**
 * Gets the encoding to use based on the type of the attribute
 * @param {string} type
 * @returns {string}
 * @private
 */
function _getEncodingFromType(type) {
  /* JSSTYLED */
  return /;binary$/.test(type) ? 'base64' : 'utf8';
}

/**
 * Converts a value to a buffer based on the given type
 * @param {*} val
 * @param {string} type
 * @returns {Buffer}
 * @private
 */
function _valueToBuffer(val, type) {
  return Buffer.isBuffer(val) ?
    val :
    new Buffer(val + '', _getEncodingFromType(type));
}
