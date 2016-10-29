
const test = require('ava')

const $tagged = Symbol('$tagged')
const q = require('../src/q')($tagged)


test('works', (t) => {
  t.deepEqual(q`SELECT 1`, [$tagged, 'SELECT 1', []])
})


test('interpolates one binding', (t) => {
  t.deepEqual(q`SELECT ${42}::int`, [$tagged, 'SELECT $1::int', [42]])
})


test('interpolates multiple bindings', (t) => {
  const [_, query, params] = q`
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
