// clones an object along with its properties
var clone = module.exports = function(obj) {
  var copy;

  // handle the 3 simple types, and null or undefined
  if (null === obj || 'object' !== typeof obj) return obj;

  // handle Date
  if (obj instanceof Date) {
    copy = new Date();
    copy.setTime(obj.getTime());

  // handle Array
  } else if (obj instanceof Array) {
    copy = [];
    for (var i = 0, l = obj.length; i < l; i++) {
      copy[i] = clone(obj[i]);
    }

  // handle Object
  } else if (obj instanceof Object) {
    copy = {};
    for (var attr in obj) {
      if (!obj.hasOwnProperty(attr)) continue;
      copy[attr] = clone(obj[attr]);
    }

  } else {
    throw new Error('Unable to copy obj! Its type isn\'t supported.');
  }

  return copy;
};
