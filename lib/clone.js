(function() {
  var clone;
  var __hasProp = Object.prototype.hasOwnProperty;

  clone = module.exports = function(obj) {
    var attr, copy, i, val;
    if (null === obj || 'object' !== typeof obj) return obj;
    if (obj instanceof Date) {
      copy = new Date();
      copy.setTime(obj.getTime());
    } else if (obj instanceof Array) {
      copy = [];
      for (i in obj) {
        val = obj[i];
        copy[i] = clone(val);
      }
    } else if (obj instanceof Object) {
      copy = {};
      for (attr in obj) {
        if (!__hasProp.call(obj, attr)) continue;
        val = obj[attr];
        copy[attr] = clone(val);
      }
    } else {
      throw new Error('Unable to copy obj! Its type isn\'t supported.');
    }
    return copy;
  };

}).call(this);
