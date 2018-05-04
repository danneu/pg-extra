const test = require('ava')
const trimIndent = require('../src/trim-indent')

test('no indent', (t) => {
    t.is(trimIndent('foo'), 'foo')
    t.is(trimIndent(''), '')
    t.is(trimIndent('\n\n'), '')
})

test('simple multiline', (t) => {
    t.is(
        trimIndent(`
    a
    b
    c
    `),
        'a\nb\nc'
    )
})

test('preserves multiline newlines', (t) => {
    t.is(
        trimIndent(`
    a

    c
    `),
        'a\n\nc'
    )
})

test('trims', (t) => {
    t.is(trimIndent('\n\na\n\n'), 'a')
})
