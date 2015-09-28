function isString(value) {
  return typeof value == 'string' ||
    value && typeof value == 'object' && toString.call(value) == stringClass || false;
}

function isUndefined(value) {
    return typeof value == 'undefined';
}

function isNull(value) {
   return value === null;
}

/** Used to determine if values are of the language type Object */
var objectTypes = {
'boolean': false,
'function': true,
'object': true,
'number': false,
'string': false,
'undefined': false
};

function isObject(value) {
  // check if the value is the ECMAScript language type of Object
  // http://es5.github.io/#x8
  // and avoid a V8 bug
  // http://code.google.com/p/v8/issues/detail?id=2291
  return !!(value && objectTypes[typeof value]);
}

function has(object, key) {
  return object ? Object.prototype.hasOwnProperty.call(object, key) : false;
}

/** `Object#toString` result shortcuts */
  var argsClass = '[object Arguments]',
      arrayClass = '[object Array]',
      boolClass = '[object Boolean]',
      dateClass = '[object Date]',
      funcClass = '[object Function]',
      numberClass = '[object Number]',
      objectClass = '[object Object]',
      regexpClass = '[object RegExp]',
      stringClass = '[object String]';

function isBoolean(value) {
  return value === true || value === false ||
    value && typeof value == 'object' && Object.prototype.toString.call(value) == boolClass || false;
}

function isNumber(value) {
  return typeof value == 'number' ||
    value && typeof value == 'object' && Object.prototype.toString.call(value) == numberClass || false;
}

function isEmpty(value) {
  var result = true;
  if (!value) {
    return result;
  }
  var className = Object.prototype.toString.call(value),
      length = value.length;

  if ((className == arrayClass || className == stringClass || className == argsClass ) ||
      (className == objectClass && typeof length == 'number' && isFunction(value.splice))) {
    return !length;
  }
  forOwn(value, function() {
    return (result = false);
  });
  return result;
}


var shimKeys = function(object) {
  var index, iterable = object, result = [];
  if (!iterable) return result;
  if (!(objectTypes[typeof object])) return result;
    for (index in iterable) {
      if (Object.prototype.hasOwnProperty.call(iterable, index)) {
        result.push(index);
      }
    }
  return result;
};

var keys = !(typeof Object.keys === 'function') ? shimKeys : function(object) {
  if (!isObject(object)) {
    return [];
  }
  return Object.keys(object);
};
