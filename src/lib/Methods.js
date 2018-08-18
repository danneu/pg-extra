const SqlStatement = require('./sqlStatement')
const PgPool = require('pg-pool')
const pump = require('pump')
const { Transform } = require('stream')
const QueryStream = require('pg-query-stream')

class Prepared {
    constructor(name, onQuery) {
        this.name = name
        this.onQuery = onQuery
    }

    async query(statement) {
        if (!(statement instanceof SqlStatement)) {
            throw new Error('must build query with sql or _raw')
        }
        return this.onQuery(statement.named(this.name))
    }
}

const Base = (pg, name) => {
    const pgOpts = { class: pg.Client, options: {} }
    if (name === 'BoundPool') {
        pgOpts.class = PgPool
        pgOpts.options.Client = pg.extra.Client
    }
    const Base = class extends pgOpts.class {
        constructor(opts = {}) {
            super(Object.assign(pgOpts.options, opts))
        }
        _query(...args) {
            return super.query(...args)
        }
        query(statement, _, cb) {
            // if callback is given, node-postgres is calling this
            // so pass it to the original query.
            if (typeof cb === 'function') {
                return this._query.apply(this, arguments)
            }
            // else we're calling it
            if (!(statement instanceof SqlStatement)) {
                return Promise.reject(
                    new Error('must build query with sql or _raw')
                )
            }
            return this._query(statement)
        }
        async one(sql, params) {
            const result = await this.query(sql, params)
            if (result.rows.length > 1) {
                console.warn('one() returned more than one row')
            }
            return result.rows[0]
        }
        async many(sql, params) {
            const result = await this.query(sql, params)
            return result.rows
        }
        prepared(name) {
            Prepared.prototype.many = this.many
            Prepared.prototype.one = this.one
            return new Prepared(name, this.query.bind(this))
        }
    }
    Object.defineProperty(Base, 'name', { value: name })
    return Base
}

const withTransaction = async function(runner) {
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

const identity = (x) => x

const poolStream = async function(statement, transform = identity) {
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

    return pump(stream, output, (err) => {
        client.release()
    })
}

module.exports = {
    Base,
    withTransaction,
    poolStream,
}
