
const {parse} = require('url')
// 1st
const $tagged = Symbol('$tagged')
const q = require('./q')($tagged)


function tagged (fn) {
  return async function ([tagged, sql, params]) {
    if (tagged !== $tagged) {
      throw new Error('sql must be generated from the "q" tag')
    }
    return fn.call(this, sql, params)
  }
}

function notTagged (fn) {
  return async function (sql, params) {
    if (Array.isArray(sql) && sql[0] === $tagged) {
      throw new Error('cannot use the "q" tag unless you enable it with {q: true}')
    }
    return fn.call(this, sql, params)
  }
}

function parseUrl (url) {
  const params = parse(url)
  let user, password
  if (params.auth) {
    [user, password] = params.auth.split(':')
  }
  return {
    user,
    password,
    host: params.hostname,
    port: params.port,
    database: params.pathname.split('/')[1]
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



module.exports = function (pg, {q: requireQ} ={}) {
  const wrapper = requireQ ? tagged : notTagged
  pg.Pool.prototype.exec = wrapper(pg.Pool.prototype.query)
  pg.Pool.prototype.many = wrapper(many)
  pg.Pool.prototype.one = wrapper(one)
  pg.Pool.prototype.withTransaction = withTransaction
  pg.Client.prototype.exec = wrapper(pg.Client.prototype.query)
  pg.Client.prototype.many = wrapper(many)
  pg.Client.prototype.one = wrapper(one)
  return {pg, q, parseUrl}
}
