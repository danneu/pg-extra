'use strict';

module.exports = function q(strings) {
  for (var _len = arguments.length, values = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    values[_key - 1] = arguments[_key];
  }

  return {
    text: strings.reduce(function (prev, chunk, i) {
      return prev + '$' + i + chunk;
    }),
    values: values
  };
};