'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _taggedTemplateLiteral2 = require('babel-runtime/helpers/taggedTemplateLiteral');

var _taggedTemplateLiteral3 = _interopRequireDefault(_taggedTemplateLiteral2);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _templateObject = (0, _taggedTemplateLiteral3.default)(['select ', '::int a'], ['select ', '::int a']),
    _templateObject2 = (0, _taggedTemplateLiteral3.default)(['select 1 b'], ['select 1 b']);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// sandbox

var _require = require('./')(require('pg'), { q: true }),
    pg = _require.pg,
    q = _require.q,
    parseUrl = _require.parseUrl;

var url = 'postgres://localhost:5432/caas';

console.log(parseUrl(url));

var pool = new pg.Pool(Object.assign(parseUrl(url)));

pool.withTransaction(function () {
  var _ref = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(client) {
    var _ref2, a, _ref3, b;

    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return client.one(q(_templateObject, 42));

          case 2:
            _ref2 = _context.sent;
            a = _ref2.a;
            _context.next = 6;
            return client.one(q(_templateObject2));

          case 6:
            _ref3 = _context.sent;
            b = _ref3.b;

            console.log({ a: a, b: b });

          case 9:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}()).then(function (rows) {
  return console.log(rows);
}).catch(function (err) {
  return console.error(err);
});