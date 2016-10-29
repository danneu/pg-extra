
const test = require('ava')

const {pg, parseUrl, q} = require('../src')(require('pg'))

// Q TAG DISABLED

const pool = new pg.Pool(parseUrl('postgres://localhost:5432/pg_extra_test'))


test('query() works', async (t) => {
  const result = await pool.query('SELECT * FROM bars WHERE n = ANY ($1) ORDER BY n', [[1,3]])
  t.deepEqual(result.rows, [{n:1},{n:3}])
})


test('many() works', async (t) => {
  const rows = await pool.many('SELECT * FROM bars WHERE n = ANY ($1) ORDER BY n', [[1,3]])
  t.deepEqual(rows, [{n:1},{n:3}])
})

test('one() works', async (t) => {
  const row = await pool.one('SELECT * FROM bars WHERE n = $1', [2])
  t.deepEqual(row, {n:2})
})

test('does not allow q tag', async (t) => {
  t.throws(pool.one(q`SELECT 1`))
})
