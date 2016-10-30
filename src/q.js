
module.exports = function q (strings, ...values) {
  return {
    text: strings.reduce((prev, chunk, i) => prev + '$' + i + chunk),
    values
  }
}
