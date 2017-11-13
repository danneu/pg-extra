const { URL } = require('url')

// Parses connection URL into the config object expected by node-postgres.
// https://node-postgres.com/api/client#new-client-config-object-
//
// The config object supports { connectionString: 'postgres://...' }
// however parsing it into an object is useful for programmatic updates.
module.exports = function parseUrl(url) {
    const params = new URL(url)

    const [, database] = params.pathname.match(/\/([^/]+)$/) || []

    return {
        user: params.username,
        password: params.password,
        host: params.hostname,
        port: Number.parseInt(params.port, 10) || 5432,
        database,
    }
}
