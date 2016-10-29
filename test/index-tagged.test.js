
const test = require('ava')

const {pg, parseUrl, q} = require('../src')(require('pg'), { q: true })

// Q TAG DISABLED

const pool = new pg.Pool(parseUrl('postgres://localhost:5432/pg-extra-test'))

test('query() works', async (t) => {
  const result = await pool.query(q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) ORDER BY n`)
  t.deepEqual(result.rows, [{n:1},{n:3}])
})

test('many() works', async (t) => {
  const rows = await pool.many(q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
  t.deepEqual(rows, [{n:1},{n:3}])
})

test('one() works', async (t) => {
  const row = await pool.one(q`SELECT * FROM bars WHERE n = ${2}`)
  t.deepEqual(row, {n:2})
})

test('requires q tag', async (t) => {
  t.throws(pool.one(`SELECT 1`))
  //t.notThrows(() => pool.one(q`SELECT 1`))
})
