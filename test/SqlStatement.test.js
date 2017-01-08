
const test = require('ava')

const {sql, _unsafe} = require('../dist/SqlStatement')




test('works', (t) => {
  const statement = sql`SELECT 1`
  t.deepEqual(statement.text, 'SELECT 1')
  t.deepEqual(statement.values, [])
})


test('interpolates one binding', (t) => {
  const statement = sql`SELECT ${42}::int`
  t.deepEqual(statement.text, 'SELECT $1::int')
  t.deepEqual(statement.values, [42])
})


test('interpolates multiple bindings', (t) => {
  const statement = sql`
     SELECT *
     FROM users
     WHERE lower(uname) = lower(${'foo'})
       AND num = ANY (${[1, 2, 3]})
  `

  t.is(statement.text, `
     SELECT *
     FROM users
     WHERE lower(uname) = lower($1)
       AND num = ANY ($2)
  `)

  t.deepEqual(statement.values, ['foo', [1, 2, 3]])
})


// =========================================================


test('append() adds a space', (t) => {
  t.is(sql`a`.append(_unsafe`b`).text, 'a b')
})


test('append(sql) pads as expected', (t) => {
  t.deepEqual(sql`SELECT ${42}::int`.append(sql`+${43}-`).text, 'SELECT $1::int +$2-')
  t.deepEqual(sql`SELECT ${42}::int`.append(sql`+${43}`).text, 'SELECT $1::int +$2')
  t.deepEqual(sql`SELECT ${42}::int`.append(sql`${43}-`).text, 'SELECT $1::int $2-')
  t.deepEqual(sql`SELECT ${42}::int`.append(sql``).text, 'SELECT $1::int ')
})


test('append(sql) does affect values', (t) => {
  const stmt = sql`SELECT ${42}::int`.append(sql`${43}`)
  t.deepEqual(stmt.values, [42, 43])
  t.deepEqual(stmt.text, 'SELECT $1::int $2')
})


test('append(_unsafe) does not affect values', (t) => {
  const stmt = sql`SELECT ${42}::int`.append(_unsafe`${42}`)
  t.deepEqual(stmt.text, 'SELECT $1::int 42')
})


test('append(_unsafe) pads as expected', (t) => {
  t.deepEqual(sql`SELECT ${42}::int`.append(_unsafe`+${43}-`).text, 'SELECT $1::int +43-')
  t.deepEqual(sql`SELECT ${42}::int`.append(_unsafe`+${43}`).text, 'SELECT $1::int +43')
  t.deepEqual(sql`SELECT ${42}::int`.append(_unsafe`${43}-`).text, 'SELECT $1::int 43-')
  t.deepEqual(sql`SELECT ${42}::int`.append(_unsafe``).text, 'SELECT $1::int ')
})


test('append() can be chained', (t) => {
  const stmt = sql`SELECT ${42}::int`
    .append(_unsafe`${43}`)
    .append(sql`${44}`)
    .append(_unsafe`${45}`)

  t.deepEqual(stmt.text, 'SELECT $1::int 43 $2 45')
  t.deepEqual(stmt.values, [42, 44])
})
