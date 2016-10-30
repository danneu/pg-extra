
const test = require('ava')

const q = require('../dist/q')


test('works', (t) => {
  t.deepEqual(q`SELECT 1`, { text: 'SELECT 1', values: [], _q: true })
})


test('interpolates one binding', (t) => {
  t.deepEqual(q`SELECT ${42}::int`, {
    text: 'SELECT $1::int',
    values: [42],
    _q: true
  })
})


test('interpolates multiple bindings', (t) => {
  const {text, values} = q`
     SELECT *
     FROM users
     WHERE lower(uname) = lower(${'foo'})
       AND num = ANY (${[1, 2, 3]})
   `

  t.is(text, `
     SELECT *
     FROM users
     WHERE lower(uname) = lower($1)
       AND num = ANY ($2)
   `)

  t.deepEqual(values, ['foo', [1, 2, 3]])
})
