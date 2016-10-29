
module.exports = function ($tagged) {
  return function q (strings, ...values) {
    let query = ''
    strings.forEach((string, i) => {
      query += string + (i < values.length ? '$' + (i + 1) : '')
    })
    //query = query.replace(/^\s+/mg, '').trim()
    return [$tagged, query, values]
  }
}
