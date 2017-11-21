const pump = require('pump')
const { Transform } = require('stream')
const QueryStream = require('pg-query-stream')
const SqlStatement = require('./sql-statement')
const parseUrl = require('./parse-url')

function query(statement, _, cb) {
    // if callback is given, node-postgres is calling this
    // so pass it to the original query.
    if (typeof cb === 'function') {
        return this._query.apply(this, arguments)
    }
    // else we're calling it
    if (!(statement instanceof SqlStatement)) {
        return Promise.reject(new Error('must build query with sql or _raw'))
    }
    return this._query(statement)
}

async function many(sql, params) {
    const result = await this.query(sql, params)
    return result.rows
}

async function one(sql, params) {
    const result = await this.query(sql, params)
    if (result.rows.length > 1) {
        console.warn('one() returned more than one row')
    }
    return result.rows[0]
}

function prepared(name) {
    return new Prepared(name, this.query.bind(this))
}

async function withTransaction(runner) {
    const client = await this.connect()

    async function rollback(err) {
        try {
            await client._query('ROLLBACK')
        } catch (err) {
            console.warn('Could not rollback transaction, removing from pool')
            client.release(err)
            err.rolledback = false
            throw err
        }
        client.release()

        if (err.code === '40P01') {
            // Deadlock
            return withTransaction(runner)
        } else if (err.code === '40001') {
            // Serialization error
            return withTransaction(runner)
        }
        err.rolledback = true
        throw err
    }

    try {
        await client._query('BEGIN')
    } catch (err) {
        return rollback(err)
    }

    let result
    try {
        result = await runner(client)
    } catch (err) {
        return rollback(err)
    }

    try {
        await client._query('COMMIT')
    } catch (err) {
        return rollback(err)
    }

    client.release()

    return result
}

// =========================================================

function Prepared(name, onQuery) {
    this.name = name
    this.onQuery = onQuery
}

Prepared.prototype.many = many

Prepared.prototype.one = one

Prepared.prototype.query = async function(statement) {
    if (!(statement instanceof SqlStatement)) {
        throw new Error('must build query with sql or __raw')
    }
    return this.onQuery(statement.named(this.name))
}

// =========================================================

async function poolStream(statement, transform = x => x) {
    if (!(statement instanceof SqlStatement)) {
        throw new Error('must build query with sql or _raw')
    }
    const client = await this.connect()
    const query = new QueryStream(statement.text, statement.values)
    const stream = client._query(query)
    const output = new Transform({
        objectMode: true,
        transform(row, encoding, cb) {
            let transformed
            try {
                transformed = transform(row)
            } catch (err) {
                return cb(err)
            }
            cb(null, transformed)
        },
    })

    return pump(stream, output, err => {
        client.release()
    })
}

// =========================================================

function extend(pg) {
    // Save original query() methods
    pg.Client.prototype._query = pg.Client.prototype.query
    pg.Pool.super_.prototype._query = pg.Pool.super_.prototype.query
    // Client + Pool
    pg.Client.prototype.query = pg.Pool.super_.prototype.query = query
    pg.Client.prototype.many = pg.Pool.super_.prototype.many = many
    pg.Client.prototype.one = pg.Pool.super_.prototype.one = one
    pg.Client.prototype.prepared = pg.Pool.super_.prototype.prepared = prepared
    // Pool only
    pg.Pool.super_.prototype.withTransaction = withTransaction
    pg.Pool.super_.prototype.stream = poolStream
    // Parse int8 into Javascript integer
    pg.types.setTypeParser(20, val => {
        return val === null ? null : Number.parseInt(val, 10)
    })
    // Parse numerics into floats
    pg.types.setTypeParser(1700, val => {
        return val === null ? null : Number.parseFloat(val)
    })
    return pg
}

// API

module.exports = {
    extend,
    parseUrl,
    q: SqlStatement.sql, // deprecated in favor of `sql`
    sql: SqlStatement.sql,
    _unsafe: SqlStatement._raw, // deprecated in favor of `_raw`
    _raw: SqlStatement._raw,
}
