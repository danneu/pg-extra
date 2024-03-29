const test = require('ava')
const { sql, _raw } = require('../src')
const trimIndent = require('../src/lib/trimIndent')

test('works', (t) => {
    const statement = sql`SELECT 1`
    t.deepEqual(statement.text, 'SELECT 1')
    t.deepEqual(statement.values, [])
})

test('clone works', (t) => {
    const statement = sql`SELECT ${100}`
    t.deepEqual(statement.text, 'SELECT $1')

    statement.append(sql`, ${200}`)
    t.deepEqual(statement.text, 'SELECT $1 , $2')

    const statement2 = statement.clone()
    statement2.append(sql`, ${300}`)
    t.deepEqual(statement.text, 'SELECT $1 , $2')
    t.deepEqual(statement2.text, 'SELECT $1 , $2 , $3')
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

    t.is(
        statement.text,
        trimIndent(`
     SELECT *
     FROM users
     WHERE lower(uname) = lower($1)
       AND num = ANY ($2)
  `)
    )

    t.deepEqual(statement.values, ['foo', [1, 2, 3]])
})

test('append() adds a space', (t) => {
    t.is(sql`a`.append(_raw`b`).text, 'a b')
})

test('append(sql) pads as expected', (t) => {
    t.deepEqual(
        sql`SELECT ${42}::int`.append(sql`+${43}-`).text,
        'SELECT $1::int +$2-'
    )
    t.deepEqual(
        sql`SELECT ${42}::int`.append(sql`+${43}`).text,
        'SELECT $1::int +$2'
    )
    t.deepEqual(
        sql`SELECT ${42}::int`.append(sql`${43}-`).text,
        'SELECT $1::int $2-'
    )
    t.deepEqual(sql`SELECT ${42}::int`.append(sql``).text, 'SELECT $1::int')
})

test('append(sql) does affect values', (t) => {
    const stmt = sql`SELECT ${42}::int`.append(sql`${43}`)
    t.deepEqual(stmt.values, [42, 43])
    t.deepEqual(stmt.text, 'SELECT $1::int $2')
})

test('append(_raw) does not affect values', (t) => {
    const stmt = sql`SELECT ${42}::int`.append(_raw`${42}`)
    t.deepEqual(stmt.text, 'SELECT $1::int 42')
})

test('append(_raw) pads as expected', (t) => {
    t.deepEqual(
        sql`SELECT ${42}::int`.append(_raw`+${43}-`).text,
        'SELECT $1::int +43-'
    )
    t.deepEqual(
        sql`SELECT ${42}::int`.append(_raw`+${43}`).text,
        'SELECT $1::int +43'
    )
    t.deepEqual(
        sql`SELECT ${42}::int`.append(_raw`${43}-`).text,
        'SELECT $1::int 43-'
    )
    t.deepEqual(sql`SELECT ${42}::int`.append(_raw``).text, 'SELECT $1::int')
})

test('append() can be chained', (t) => {
    const stmt = sql`SELECT ${42}::int`
        .append(_raw`${43}`)
        .append(sql`${44}`)
        .append(_raw`${45}`)

    t.deepEqual(stmt.text, 'SELECT $1::int 43 $2 45')
    t.deepEqual(stmt.values, [42, 44])
})

test('append() accepts ignores falsey values', async (t) => {
    const stmt = sql`SELECT`
        .append(null)
        .append(false)
        .append(undefined)
        .append(0)
        .append('')
        .append(_raw`${42}`)

    t.deepEqual(stmt.text, 'SELECT 42')
})

test('does not apply binding-reuse optimization to nil values', (t) => {
    const a = null
    const b = null
    const c = undefined
    const d = undefined
    const stmt = sql`INSERT INTO foo (a, b, c, d) VALUES (${a}, ${b}, ${c}, ${d})`
    t.deepEqual(
        { text: stmt.text, values: stmt.values },
        {
            text: 'INSERT INTO foo (a, b, c, d) VALUES ($1, $2, $3, $4)',
            values: [null, null, undefined, undefined],
        }
    )
})
