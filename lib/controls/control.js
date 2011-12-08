// Copyright 2011 Mark Cavage, Inc.  All rights reserved.

var assert = require('assert');
var util = require('util');

var asn1 = require('asn1');

var Protocol = require('../protocol');

///--- Globals
var Ber = asn1.Ber;

///--- API

function Control(options) {
  if (options) {
    if (typeof(options) !== 'object')
      throw new TypeError('options must be an object');
    if (options.type && typeof(options.type) !== 'string')
      throw new TypeError('options.type must be a string');
    if (options.criticality !== undefined &&
        typeof(options.criticality) !== 'boolean')
      throw new TypeError('options.criticality must be a boolean');
    if (options.value && typeof(options.value) !== 'string')
      throw new TypeError('options.value must be a string');
  } else {
    options = {};
  }

  this.type = options.type || '';
  this.criticality = options.criticality || false;
  this.value = options.value || undefined;

  var self = this;
  this.__defineGetter__('json', function() {
    return {
      controlType: self.type,
      criticality: self.criticality,
      controlValue: self.value
    };
  });
}
module.exports = Control;

Control.prototype.toString = function() {
  return this.json;
};

Control.prototype.toBer = function(ber) {
  assert.ok(ber);

  ber.startSequence();
  ber.writeString(this.type || '');
  ber.writeBoolean(this.criticality);
  if (this.value)
    ber.writeString(this.value);
  ber.endSequence();
};
