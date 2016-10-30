
const test = require('ava')

const {extend, parseUrl, q} = require('../dist')
const pg = extend(require('pg'))

const url = 'postgres://localhost:5432/pg_extra_test'

const pool = new pg.Pool(parseUrl(url))

async function withClient (runner) {
  const client = new pg.Client(parseUrl(url))
  await client.connect()
  try {
    await runner(client)
  } finally {
    await client.end()
  }
}


// WITHOUT Q

test('pool.query() requires q-built query', async (t) => {
  t.throws(pool.query('SELECT 1'), /with q/)
})

test('client.query() requires q-built query', async (t) => {
  await withClient((client) => {
    t.throws(client.query('SELECT 1'), /with q/)
  })
})

// WITH Q

test('client.query() works with q', async (t) => {
  await withClient(async (client) => {
    const result = await client.query(q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) ORDER BY n`)
    t.deepEqual(result.rows, [{n:1},{n:3}])
  })
})

test('pool.query() works with q', async (t) => {
  const result = await pool.query(q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) ORDER BY n`)
  t.deepEqual(result.rows, [{n:1},{n:3}])
})

test('client.many() works with q', async (t) => {
  await withClient(async (client) => {
    const rows = await client.many(q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
    t.deepEqual(rows, [{n:1},{n:3}])
  })
})

test('pool.many() works with q', async (t) => {
  const rows = await pool.many(q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
  t.deepEqual(rows, [{n:1},{n:3}])
})

test('client.one() works with q', async (t) => {
  await withClient(async (client) => {
    const row = await client.one(q`SELECT * FROM bars WHERE n = ${2}`)
    t.deepEqual(row, {n:2})
  })
})

test('pool.one() works with q', async (t) => {
  const row = await pool.one(q`SELECT * FROM bars WHERE n = ${2}`)
  t.deepEqual(row, {n:2})
})

// PARSING

test('parses int8 into Javascript integer', async (t) => {
  const {n} = await pool.one(q`SELECT 123::int8 n`)
  // this would be a string "123" without the setTypeParser(20) fix
  t.is(n, 123)
})

test('parses numerics into Javascript floats', async (t) => {
  const {n} = await pool.one(q`SELECT 123::numeric n`)
  // this would be a string "123" without the setTypeParser(1700) fix
  t.is(n, 123)
})


// PREPARED

test('prepared() requires q-tag', async (t) => {
  const promise = pool.prepared('foo').many(`select * from bars where n = ${1}`)
  t.throws(promise, /with q/)
})


test('pool.prepared().query() works', async (t) => {
  const result = await pool.prepared('foo').query(q`select * from bars where n = ${1}`)
  t.deepEqual(result.rows, [{n:1}])
})
test('pool.prepared().many() works', async (t) => {
  const rows = await pool.prepared('foo').many(q`select * from bars where n = ${1}`)
  t.deepEqual(rows, [{n:1}])
})
test('pool.prepared().one() works', async (t) => {
  const row = await pool.prepared('foo').one(q`select * from bars where n = ${1}`)
  t.deepEqual(row, {n:1})
})


// TRANSACTION

test('withTransaction sanity check', async (t) => {
  await pool.withTransaction(async (client) => {
    const {n} = await client.one(q`SELECT 1 n`)
    t.is(n, 1)
  })
})

test('withTransaction can successfully rollback', async (t) => {
  try {
    await pool.withTransaction(async (client) => {
      throw new Error('fake error')
    })
  } catch (err) {
    return t.true(err.rolledback)
  }
  t.fail()
})
