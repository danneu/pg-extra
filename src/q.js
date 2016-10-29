
module.exports = function q (strings, ...values) {
  let query = ''
  strings.forEach((string, i) => {
    query += string + (i < values.length ? '$' + (i + 1) : '')
  })
  return [query, values]
}
