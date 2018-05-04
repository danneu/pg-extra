const deepClone = require('clone-deep')
const trimIndent = require('./trim-indent')

class SqlStatement {
    constructor(strings, values = []) {
        this.strings = strings
        this.values = []
        // Mapping of $binding to this.values idx
        // i.e. 0 -> 2 means $1 -> this.values[2]
        this.bindings = []
        this._addValues(values)
    }

    // Returns a new deep-cloned instance.
    clone() {
        return new SqlStatement(this.strings.slice(0), deepClone(this.values))
    }

    // Appends another statement onto this statement, mutating and returning this statement.
    append(statement) {
        // falsey values no-op to make conditional appends easier
        if (!statement) {
            return this
        }

        if (!(statement instanceof SqlStatement)) {
            throw new Error('append() must build query with `sql` or `_raw`')
        }

        this.strings = this.strings
            .slice(0, this.strings.length - 1)
            .concat([
                this.strings[this.strings.length - 1] +
                    ' ' +
                    statement.strings[0],
                ...statement.strings.slice(1),
            ])

        this._addValues(statement.values)

        return this
    }

    named(name) {
        this.name = name
        return this
    }

    // Returns the SQL string with $binding placeholders. (used by node-postgres)
    //
    // Attempts to remove newline and indentation noise.
    get text() {
        const text = this.strings.reduce((prev, curr, i) => {
            const v = this.values[this.bindings[i - 1]]
            // TODO: Use Map for reverse lookup
            const binding = this.values.indexOf(v) + 1
            return prev + '$' + binding + curr
        })

        return trimIndent(text)
    }

    // Updates this.values and this.bindings with additional values
    _addValues(values) {
        for (const v of values) {
            const i = this.values.indexOf(v)
            if (i > -1) {
                this.bindings.push(i)
            } else {
                this.values.push(v)
                this.bindings.push(this.values.length - 1)
            }
        }
    }
}

// TAGGED STRING TEMPLATES

SqlStatement.sql = function(strings, ...values) {
    return new SqlStatement(strings, values)
}

SqlStatement._raw = function(strings, ...values) {
    const text = strings.reduce(
        (prev, chunk, i) => prev + values[i - 1] + chunk
    )
    return new SqlStatement([text])
}

module.exports = SqlStatement
