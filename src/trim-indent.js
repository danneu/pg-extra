// Counts number of spaces that prefix string.
//
// 'foo' -> 0
// '    foo' -> 4
function countIndent(string) {
    return string.match(/^[ ]*/)[0].length
}

// Removes the left whitespace margin from each line in the string.
module.exports = function trimIndent(string) {
    const lines = string.split('\n')
    const minIndent = lines.filter(Boolean).reduce((acc, line) => {
        const indent = countIndent(line)
        return acc < indent ? acc : indent
    }, Infinity)
    return lines
        .map(line => {
            return line.slice(minIndent)
        })
        .join('\n')
        .trim()
}
