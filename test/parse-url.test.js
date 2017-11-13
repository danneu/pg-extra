const test = require('ava')
const parseUrl = require('../src/parse-url')

test('basic case', t => {
    t.deepEqual(parseUrl('postgres://user:pass@example.com:1234/dbname'), {
        user: 'user',
        password: 'pass',
        host: 'example.com',
        port: 1234,
        database: 'dbname',
    })
})

test('missing auth', t => {
    t.deepEqual(parseUrl('postgres://example.com:1234/dbname'), {
        user: '',
        password: '',
        host: 'example.com',
        port: 1234,
        database: 'dbname',
    })
})

test('default port', t => {
    t.deepEqual(parseUrl('postgres://example.com/dbname'), {
        user: '',
        password: '',
        host: 'example.com',
        port: 5432,
        database: 'dbname',
    })
})
