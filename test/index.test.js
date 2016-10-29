
const test = require('ava')

const {extend, parseUrl, q} = require('../dist')
const pg = extend(require('pg'))

const pool = new pg.Pool(parseUrl('postgres://localhost:5432/pg_extra_test'))

// WITHOUT Q

test('many() works with regular bindings', async (t) => {
  const rows = await pool.many('SELECT * FROM bars WHERE n = ANY ($1) ORDER BY n', [[1,3]])
  t.deepEqual(rows, [{n:1},{n:3}])
})

test('one() works with regular bindings', async (t) => {
  const row = await pool.one('SELECT * FROM bars WHERE n = $1', [2])
  t.deepEqual(row, {n:2})
})

// WITH Q

test('query() works with q', async (t) => {
  const result = await pool.query(...q`SELECT * FROM bars WHERE n = ANY (${[1,3]}) ORDER BY n`)
  t.deepEqual(result.rows, [{n:1},{n:3}])
})

test('many() works with q', async (t) => {
  const rows = await pool.many(...q`SELECT * FROM bars WHERE n = ANY (${[1,3]})`)
  t.deepEqual(rows, [{n:1},{n:3}])
})

test('one() works with q', async (t) => {
  const row = await pool.one(...q`SELECT * FROM bars WHERE n = ${2}`)
  t.deepEqual(row, {n:2})
})
