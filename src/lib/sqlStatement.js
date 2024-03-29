const deepClone = require('clone-deep')
const trimIndent = require('./trimIndent')

class SqlStatement {
    constructor(strings, values = []) {
        this.strings = strings
        this.values = values
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
                `${this.strings[this.strings.length - 1]} ${
                    statement.strings[0]
                }`,
                ...statement.strings.slice(1),
            ])

        this.values = this.values.concat(statement.values)

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
        const text = this.strings.reduce(
            (prev, curr, i) => prev + '$' + i + curr
        )
        return trimIndent(text)
    }
}

// TAGGED STRING TEMPLATES

SqlStatement.sql = (strings, ...values) => new SqlStatement(strings, values)

SqlStatement._raw = (strings, ...values) => {
    const text = strings.reduce(
        (prev, chunk, i) => prev + values[i - 1] + chunk
    )
    return new SqlStatement([text])
}

module.exports = SqlStatement
