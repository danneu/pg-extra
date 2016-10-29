'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _slicedToArray2 = require('babel-runtime/helpers/slicedToArray');

var _slicedToArray3 = _interopRequireDefault(_slicedToArray2);

var many = function () {
  var _ref3 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee(sql, params) {
    var result;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _context.next = 2;
            return this.query(sql, params);

          case 2:
            result = _context.sent;
            return _context.abrupt('return', result.rows);

          case 4:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, this);
  }));

  return function many(_x, _x2) {
    return _ref3.apply(this, arguments);
  };
}();

var one = function () {
  var _ref4 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee2(sql, params) {
    var result;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _context2.next = 2;
            return this.query(sql, params);

          case 2:
            result = _context2.sent;

            if (result.rows.length > 1) {
              console.warn('one() returned more than one row');
            }
            return _context2.abrupt('return', result.rows[0]);

          case 5:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, this);
  }));

  return function one(_x3, _x4) {
    return _ref4.apply(this, arguments);
  };
}();

var withTransaction = function () {
  var _ref5 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee4(runner) {
    var rollback = function () {
      var _ref6 = (0, _asyncToGenerator3.default)(_regenerator2.default.mark(function _callee3(err) {
        return _regenerator2.default.wrap(function _callee3$(_context3) {
          while (1) {
            switch (_context3.prev = _context3.next) {
              case 0:
                _context3.prev = 0;
                _context3.next = 3;
                return client.query('ROLLBACK');

              case 3:
                _context3.next = 10;
                break;

              case 5:
                _context3.prev = 5;
                _context3.t0 = _context3['catch'](0);

                console.log('Could not rollback transaction, removing from pool');
                client.release(_context3.t0);
                throw _context3.t0;

              case 10:
                client.release();

                if (!(err.code === '40P01')) {
                  _context3.next = 15;
                  break;
                }

                return _context3.abrupt('return', withTransaction(runner));

              case 15:
                if (!(err.code === '40001')) {
                  _context3.next = 17;
                  break;
                }

                return _context3.abrupt('return', withTransaction(runner));

              case 17:
                throw err;

              case 18:
              case 'end':
                return _context3.stop();
            }
          }
        }, _callee3, this, [[0, 5]]);
      }));

      return function rollback(_x6) {
        return _ref6.apply(this, arguments);
      };
    }();

    var client, result;
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            _context4.next = 2;
            return this.connect();

          case 2:
            client = _context4.sent;
            _context4.prev = 3;
            _context4.next = 6;
            return client.query('BEGIN');

          case 6:
            _context4.next = 11;
            break;

          case 8:
            _context4.prev = 8;
            _context4.t0 = _context4['catch'](3);
            return _context4.abrupt('return', rollback(_context4.t0));

          case 11:
            result = void 0;
            _context4.prev = 12;
            _context4.next = 15;
            return runner(client);

          case 15:
            result = _context4.sent;
            _context4.next = 21;
            break;

          case 18:
            _context4.prev = 18;
            _context4.t1 = _context4['catch'](12);
            return _context4.abrupt('return', rollback(_context4.t1));

          case 21:
            _context4.prev = 21;
            _context4.next = 24;
            return client.query('COMMIT');

          case 24:
            _context4.next = 29;
            break;

          case 26:
            _context4.prev = 26;
            _context4.t2 = _context4['catch'](21);
            return _context4.abrupt('return', rollback(_context4.t2));

          case 29:

            client.release();

            return _context4.abrupt('return', result);

          case 31:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, this, [[3, 8], [12, 18], [21, 26]]);
  }));

  return function withTransaction(_x5) {
    return _ref5.apply(this, arguments);
  };
}();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('url'),
    parse = _require.parse;
// 1st


var q = require('./q');

function parseUrl(url) {
  var params = parse(url);
  var user = void 0,
      password = void 0;
  if (params.auth) {
    var _params$auth$split = params.auth.split(':');

    var _params$auth$split2 = (0, _slicedToArray3.default)(_params$auth$split, 2);

    user = _params$auth$split2[0];
    password = _params$auth$split2[1];
  }

  var _ref = params.pathname.match(/\/(.+)$/) || [],
      _ref2 = (0, _slicedToArray3.default)(_ref, 2),
      _ = _ref2[0],
      database = _ref2[1];

  return {
    user: user,
    password: password,
    host: params.hostname,
    port: params.port || 5432,
    database: database
  };
}

function extend(pg) {
  pg.Pool.prototype.many = many;
  pg.Pool.prototype.one = one;
  pg.Pool.prototype.withTransaction = withTransaction;
  pg.Client.prototype.many = many;
  pg.Client.prototype.one = one;
  return pg;
}

// API


module.exports = {
  extend: extend, q: q, parseUrl: parseUrl
};