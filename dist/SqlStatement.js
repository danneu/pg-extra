'use strict';

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

var _classCallCheck2 = require('babel-runtime/helpers/classCallCheck');

var _classCallCheck3 = _interopRequireDefault(_classCallCheck2);

var _createClass2 = require('babel-runtime/helpers/createClass');

var _createClass3 = _interopRequireDefault(_createClass2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var SqlStatement = function () {
  function SqlStatement(strings) {
    var values = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
    (0, _classCallCheck3.default)(this, SqlStatement);

    this.strings = strings;
    this.values = values;
  }

  (0, _createClass3.default)(SqlStatement, [{
    key: 'append',
    value: function append(statement) {
      if (!(statement instanceof SqlStatement)) {
        throw new Error('append() must build query with `sql`, `q` (Note: renamed to `sql`), or `_unsafe`');
      }
      this.strings = this.strings.slice(0, this.strings.length - 1).concat([this.strings[this.strings.length - 1] + ' ' + statement.strings[0]].concat((0, _toConsumableArray3.default)(statement.strings.slice(1))));
      this.values = this.values.concat(statement.values);
      return this;
    }
  }, {
    key: 'named',
    value: function named(name) {
      this.name = name;
      return this;
    }

    // used by node-postgres

  }, {
    key: 'text',
    get: function get() {
      return this.strings.reduce(function (prev, curr, i) {
        return prev + '$' + i + curr;
      });
    }
  }]);
  return SqlStatement;
}();

SqlStatement.sql = function (strings) {
  for (var _len = arguments.length, values = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    values[_key - 1] = arguments[_key];
  }

  return new SqlStatement(strings, values);
};

SqlStatement._unsafe = function (strings) {
  for (var _len2 = arguments.length, values = Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
    values[_key2 - 1] = arguments[_key2];
  }

  var text = strings.reduce(function (prev, chunk, i) {
    return prev + values[i - 1] + chunk;
  });
  return new SqlStatement([text]);
};

module.exports = SqlStatement;