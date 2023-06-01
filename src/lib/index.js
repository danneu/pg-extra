const methods = require('./Methods')

module.exports = (pg, name) => {
    const extendedClass = methods.Base(pg, name)
    if (name === 'BoundPool') {
        extendedClass.prototype.withTransaction = methods.withTransaction
        extendedClass.prototype.stream = methods.poolStream
    }
    return extendedClass
}
