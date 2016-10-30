
const {parse} = require('url')
// 1st
const q = require('./q')

// =========================================================

function parseUrl (url) {
  const params = parse(url)
  let user, password
  if (params.auth) {
    [user, password] = params.auth.split(':')
  }
  const [_, database] = params.pathname.match(/\/(.+)$/) || []
  return {
    user,
    password,
    host: params.hostname,
    port: params.port || 5432,
    database: database
  }
}

// =========================================================

function query ({text, values, _q} = {}, _, cb) {
  // if callback is given, node-postgres is calling this
  // so pass it to the original query.
  if (typeof cb === 'function') {
    return this._query.apply(this, arguments)
  }
  // else we're calling it
  if (!_q) {
    return Promise.reject(new Error('must build query with q'))
  }
  return this._query({text, values})
}

async function many (sql, params) {
  const result = await this.query(sql, params)
  return result.rows
}

async function one (sql, params) {
  const result = await this.query(sql, params)
  if (result.rows.length > 1) {
    console.warn('one() returned more than one row')
  }
  return result.rows[0]
}

function prepared (name) {
  return new Prepared(name, this.query.bind(this))
}

async function withTransaction (runner) {
  const client = await this.connect()

  async function rollback (err) {
    try {
      await client._query('ROLLBACK')
    } catch (err) {
      console.log('Could not rollback transaction, removing from pool')
      client.release(err)
      throw err
    }
    client.release()

    if (err.code === '40P01') { // Deadlock
      return withTransaction(runner)
    } else if (err.code === '40001') { // Serialization error
      return withTransaction(runner)
    }
    throw err
  }

  try {
    await client._query('BEGIN')
  } catch (err) {
    return rollback(err)
  }

  let result
  try {
    result = await runner(client)
  } catch (err) {
    return rollback(err)
  }

  try {
    await client._query('COMMIT')
  } catch (err) {
    return rollback(err)
  }

  client.release()

  return result
}

// =========================================================

function Prepared (name, onQuery) {
  this.name = name
  this.onQuery = onQuery
}

Prepared.prototype.many = many

Prepared.prototype.one = one

Prepared.prototype.query = async function ({text, values, _q} = {}) {
  if (!_q) {
    throw new Error('must build query with q')
  }
  return this.onQuery({name: this.name, text, values, _q})
}

// =========================================================


function extend (pg) {
  // Save original query() methods
  pg.Client.prototype._query = pg.Client.prototype.query
  pg.Pool.prototype._query = pg.Pool.prototype.query
  // Client + Pool
  pg.Client.prototype.query = pg.Pool.prototype.query = query
  pg.Client.prototype.many = pg.Pool.prototype.many = many
  pg.Client.prototype.one = pg.Pool.prototype.one = one
  pg.Client.prototype.prepared = pg.Pool.prototype.prepared = prepared
  // Pool only
  pg.Pool.prototype.withTransaction = withTransaction
  // Parse int8 into Javascript integer
  pg.types.setTypeParser(20, (val) => {
    return val === null ? null : Number.parseInt(val, 10)
  })
  // Parse numerics into floats
  pg.types.setTypeParser(1700, (val) => {
    return val === null ? null : Number.parseFloat(val)
  })
  return pg
}


// API


module.exports = {
  extend, q, parseUrl
}
