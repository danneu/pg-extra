'use strict';

module.exports = function q(strings) {
  for (var _len = arguments.length, values = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    values[_key - 1] = arguments[_key];
  }

  var query = '';
  strings.forEach(function (string, i) {
    query += string + (i < values.length ? '$' + (i + 1) : '');
  });
  return [query, values];
};