
const {parse} = require('url')
// 1st
const q = require('./q')

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

function ensureSpread (fn) {
  return async function (sql, params) {
    if (Array.isArray(sql)) {
      throw new Error('sql was an array. did you mean to ...spread the q tag?')
    }
    return fn.call(this, sql, params)
  }
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

async function withTransaction (runner) {
  const client = await this.connect()

  async function rollback (err) {
    try {
      await client.query('ROLLBACK')
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
    await client.query('BEGIN')
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
    await client.query('COMMIT')
  } catch (err) {
    return rollback(err)
  }

  client.release()

  return result
}


// TODO: We should only have to ensureSpread() the client.query
// since it's used by everything else. But I can't seem to get it
// to work.
function extend (pg) {
  // TODO: pg.Client.prototype.query = ensureSpread(pg.Client.prototype.query)
  pg.Client.prototype.many = ensureSpread(many)
  pg.Client.prototype.one = ensureSpread(one)
  pg.Pool.prototype.query = ensureSpread(pg.Pool.prototype.query)
  pg.Pool.prototype.many = ensureSpread(many)
  pg.Pool.prototype.one = ensureSpread(one)
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
