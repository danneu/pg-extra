const test = require('ava')
const { extend, sql } = require('../src')
const pg = extend(require('pg'))
const { connectionString } = require('./util')
const toArray = require('stream-to-array')

const pool = new pg.Pool({ connectionString })

test('pool stream without tranformer', async t => {
    const stream = await pool.stream(
        sql`select generate_series i from generate_series(0, 5)`
    )
    const array = (await toArray(stream)).map(row => row.i)
    t.deepEqual(array, [0, 1, 2, 3, 4, 5])
})

test('pool stream with tranformer', async t => {
    const stream = await pool.stream(
        sql`select generate_series i from generate_series(0, 5)`,
        row => row.i + 100
    )
    const array = await toArray(stream)
    t.deepEqual(array, [100, 101, 102, 103, 104, 105])
})
