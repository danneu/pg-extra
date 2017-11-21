const test = require('ava')
const { extend, sql, _raw } = require('../src')
const pg = extend(require('pg'))
const { connectionString } = require('./util')

const pool = new pg.Pool({ connectionString })

async function withClient(runner) {
    const client = new pg.Client({ connectionString })
    await client.connect()
    try {
        await runner(client)
    } finally {
        await client.end()
    }
}

// WITHOUT TAG

test('pool.query() requires tagged query', async t => {
    t.throws(pool.query('SELECT 1'), /must build/)
})

test('client.query() requires tagged query', async t => {
    await withClient(client => {
        t.throws(client.query('SELECT 1'), /must build/)
    })
})

test('append() fails if untagged', async t => {
    t.throws(() => pool.query(sql`SELECT 1`.append('nope')), /must build/)
})

// WITH TAG

test('client.query() works with sql tag', async t => {
    await withClient(async client => {
        const result = await client.query(
            sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]}) ORDER BY n`
        )
        t.deepEqual(result.rows, [{ n: 1 }, { n: 3 }])
    })
})
test('client.query() works with _raw tag', async t => {
    await withClient(async client => {
        const result = await client.query(
            _raw`SELECT * FROM bars WHERE n IN (${1}, ${3}) ORDER BY n ${'desc'}`
        )
        t.deepEqual(result.rows, [{ n: 3 }, { n: 1 }])
    })
})

test('pool.query() works with sql tag', async t => {
    const result = await pool.query(
        sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]}) ORDER BY n`
    )
    t.deepEqual(result.rows, [{ n: 1 }, { n: 3 }])
})

test('client.many() works with sql tag', async t => {
    await withClient(async client => {
        const rows = await client.many(
            sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]})`
        )
        t.deepEqual(rows, [{ n: 1 }, { n: 3 }])
    })
})

test('pool.many() works with sql tag', async t => {
    const rows = await pool.many(
        sql`SELECT * FROM bars WHERE n = ANY (${[1, 3]})`
    )
    t.deepEqual(rows, [{ n: 1 }, { n: 3 }])
})

test('client.one() works with sql tag', async t => {
    await withClient(async client => {
        const row = await client.one(sql`SELECT * FROM bars WHERE n = ${2}`)
        t.deepEqual(row, { n: 2 })
    })
})

test('pool.one() works with sql tag', async t => {
    const row = await pool.one(sql`SELECT * FROM bars WHERE n = ${2}`)
    t.deepEqual(row, { n: 2 })
})

// PARSING

test('parses int8 into Javascript integer', async t => {
    const { n } = await pool.one(sql`SELECT 123::int8 n`)
    // this would be a string "123" without the setTypeParser(20) fix
    t.is(n, 123)
})

test('parses numerics into Javascript floats', async t => {
    const { n } = await pool.one(sql`SELECT 123::numeric n`)
    // this would be a string "123" without the setTypeParser(1700) fix
    t.is(n, 123)
})

// PREPARED

test('prepared() requires tag', async t => {
    const promise = pool
        .prepared('foo')
        .many(`select * from bars where n = ${1}`)
    t.throws(promise, /must build/)
})

test('pool.prepared().query() works', async t => {
    const result = await pool
        .prepared('foo')
        .query(sql`select * from bars where n = ${1}`)
    t.deepEqual(result.rows, [{ n: 1 }])
})
test('pool.prepared().many() works', async t => {
    const rows = await pool
        .prepared('foo')
        .many(sql`select * from bars where n = ${1}`)
    t.deepEqual(rows, [{ n: 1 }])
})
test('pool.prepared().one() works', async t => {
    const row = await pool
        .prepared('foo')
        .one(sql`select * from bars where n = ${1}`)
    t.deepEqual(row, { n: 1 })
})

// TRANSACTION

test('withTransaction sanity check', async t => {
    await pool.withTransaction(async client => {
        const { n } = await client.one(sql`SELECT 1 n`)
        t.is(n, 1)
    })
})

test('withTransaction can successfully rollback', async t => {
    try {
        await pool.withTransaction(async () => {
            throw new Error('fake error')
        })
    } catch (err) {
        return t.true(err.rolledback)
    }
    t.fail()
})
