
const test = require('ava')

const q = require('../dist/q')


test('works', (t) => {
  t.deepEqual(q`SELECT 1`, ['SELECT 1', []])
})


test('interpolates one binding', (t) => {
  t.deepEqual(q`SELECT ${42}::int`, ['SELECT $1::int', [42]])
})


test('interpolates multiple bindings', (t) => {
  const [query, params] = q`
     SELECT *
     FROM users
     WHERE lower(uname) = lower(${'foo'})
       AND num = ANY (${[1, 2, 3]})
   `

  t.is(query, `
     SELECT *
     FROM users
     WHERE lower(uname) = lower($1)
       AND num = ANY ($2)
   `)

  t.deepEqual(params, ['foo', [1, 2, 3]])
})
