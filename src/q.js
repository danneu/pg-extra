
module.exports = function q (strings, ...values) {
  return {
    _q: true,
    text: strings.reduce((prev, chunk, i) => prev + '$' + i + chunk),
    values
  }
}
