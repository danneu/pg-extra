
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


function extend (pg) {
  pg.Pool.prototype.many = many
  pg.Pool.prototype.one = one
  pg.Pool.prototype.withTransaction = withTransaction
  pg.Client.prototype.many = many
  pg.Client.prototype.one = one
  return pg
}


// API


module.exports = {
  extend, q, parseUrl
}
