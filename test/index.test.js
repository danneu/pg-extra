
const test = require('ava')

const {pg, parseUrl, q} = require('../src')(require('pg'))
//const {pg: pgQ} = require('../src')(require('pg'), {q: true})

// createdb pg-extra-test
// psql pg-extra-test
// > create table bars (n int not null);
// > insert into bars (n) values (1), (2), (3);


// Q TAG DISABLED

const pool = new pg.Pool(parseUrl('postgres://localhost:5432/pg-extra-test'))


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
