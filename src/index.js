const extra = require('./lib')
const { sql, _raw } = require('./lib/sqlStatement')

module.exports = {
    extend,
    sql,
    _raw,
}

function extend(pg) {
    // Save original query() methods
    pg.extra = {}
    pg.extra.Client = extra(pg, 'Client')
    pg.extra.Pool = extra(pg, 'BoundPool')

    // Parse int8 into Javascript integer
    pg.types.setTypeParser(20, (val) => {
        return val === null ? null : Number.parseInt(val, 10)
    })

    // Parse numerics into floats
    pg.types.setTypeParser(1700, (val) => {
        return val === null ? null : Number.parseFloat(val)
    })

    return pg
}
