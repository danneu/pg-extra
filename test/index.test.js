
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

test('client.many() works with regular bindings', async (t) => {
  await withClient(async (client) => {
    const rows = await client.many('SELECT * FROM bars WHERE n = ANY ($1) ORDER BY n', [[1,3]])
    t.deepEqual(rows, [{n:1},{n:3}])
  })
})


test('pool.many() works with regular bindings', async (t) => {
  const rows = await pool.many('SELECT * FROM bars WHERE n = ANY ($1) ORDER BY n', [[1,3]])
  t.deepEqual(rows, [{n:1},{n:3}])
})

test('client.one() works with regular bindings', async (t) => {
  await withClient(async (client) => {
    const row = await client.one('SELECT * FROM bars WHERE n = $1', [2])
    t.deepEqual(row, {n:2})
  })
})


test('pool.one() works with regular bindings', async (t) => {
  const row = await pool.one('SELECT * FROM bars WHERE n = $1', [2])
  t.deepEqual(row, {n:2})
})

// WITH Q

test('client.query() works with q', async (t) => {
  await withClient(async (client) => {
    const result = await client.query(...q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) ORDER BY n`)
    t.deepEqual(result.rows, [{n:1},{n:3}])
  })
})

test('pool.query() works with q', async (t) => {
  const result = await pool.query(...q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) ORDER BY n`)
  t.deepEqual(result.rows, [{n:1},{n:3}])
})

test('client.many() works with q', async (t) => {
  await withClient(async (client) => {
    const rows = await client.many(...q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
    t.deepEqual(rows, [{n:1},{n:3}])
  })
})

test('pool.many() works with q', async (t) => {
  const rows = await pool.many(...q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
  t.deepEqual(rows, [{n:1},{n:3}])
})

test('client.one() works with q', async (t) => {
  await withClient(async (client) => {
    const row = await client.one(...q`SELECT * FROM bars WHERE n = ${2}`)
    t.deepEqual(row, {n:2})
  })
})

test('pool.one() works with q', async (t) => {
  const row = await pool.one(...q`SELECT * FROM bars WHERE n = ${2}`)
  t.deepEqual(row, {n:2})
})

// FORGETTING SPREAD

// TODO: Get this working
// test('client.query() complains if you forget to spread q', async (t) => {
//   await withClient(async (client) => {
//     const promise = client.query(q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
//     t.throws(promise, /sql was an array/)
//     return promise
//   })
// })


test('pool.query() complains if you forget to spread q', (t) => {
  const promise = pool.query(q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
  t.throws(promise, /sql was an array/)
})


test('client.many() complains if you forget to spread q', async (t) => {
  await withClient(async (client) => {
    const promise = client.many(q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
    t.throws(promise, /sql was an array/)
  })
})

test('pool.many() complains if you forget to spread q', (t) => {
  const promise = pool.many(q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
  t.throws(promise, /sql was an array/)
})

test('client.one() complains if you forget to spread q', async (t) => {
  await withClient(async (client) => {
    const promise = client.many(q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) LIMIT 1`)
    t.throws(promise, /sql was an array/)
  })
})

test('pool.one() complains if you forget to spread q', (t) => {
  const promise = pool.one(q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) LIMIT 1`)
  t.throws(promise, /sql was an array/)
})

// PARSING

test('parses int8 into Javascript integer', async (t) => {
  const {n} = await pool.one('SELECT 123::int8 n')
  // this would be a string "123" without the setTypeParser(20) fix
  t.is(n, 123)
})

test('parses numerics into Javascript floats', async (t) => {
  const {n} = await pool.one('SELECT 123::numeric n')
  // this would be a string "123" without the setTypeParser(1700) fix
  t.is(n, 123)
})

