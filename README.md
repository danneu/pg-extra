
(Experimental)

# pg-extra

Useful extensions to the node-postgres client.

- Extends pg.Pool with prototype methods `many`, `one`, `withTransaction`.
- Extends pg.Client with prototype methods `many`, `one`.
- Exposes a `q` template literal helper for writing queries.
  Enable it with `require('post-extra')(require('pg'), { q: true })`
  which will require your queries to be tagged with `q` to prevent
  unprotected string interpolation.

## Install

    npm install --save pg-extra pg

## Experimental

Since this is experimental, I'm not going to bother compiling it with Babel
until I'm happy with it.

Until then, it only support Node v7.x with the flag:

    node --harmony-async-await

## Usage

``` javascript
const {pg, q, parseUrl} = require('pg-extra')(require('pg'), { q: true })

const url = 'postgres://user:pass@localhost:5432/my-db'
const pool = new pg.Pool(Object.assign(parseUrl(url), {
  ssl: true,
  // ...
}))

exports.findUserByUname = async function (uname) {
  return pool.one(q`
    SELECT *
    FROM users
    WHERE lower(uname) = lower(${uname})
  `)
}

exports.listUsersInCities = async function (cities) {
  return pool.many(q`
    SELECT *
    FROM users
    WHERE city = ANY(${cities})
  `)
}

exports.transferBalance = async function (from, to, amount) {
  return pool.withTransaction(async (client) => {
    await client.query(q`
      UPDATE accounts SET amount = amount - ${amount} WHERE id = ${from}
    `)
    await client.query(q`
      UPDATE accounts SET amount = amount + ${amount} WHERE id = ${to}
    `)
  })
}
```

## Extensions

Toggle on the `q` helpers with `require('pg-extra')(require('pg'), { q: true })`.

### When `{ q: false }`

- `pool.many(sql, params)`: Resolves an array of rows.
- `pool.one(sql, params)`: Resolves one row or null.
- `client.many(sql, params)`: Resolves an array of rows.
- `client.one(sql, params)`: Resolves one row or null.

### When `{ q: true }`

- `pool.many(q``sql``)`: Resolves an array of rows.
- `pool.one(q``sql``)`: Resolves one row or null.
- `client.many(q``sql``)`: Resolves an array of rows.
- `client.one(q``sql``)`: Resolves one row or null.

### The `q` query template tag

`q` is a simple helper that translates this:

``` javascript
q`
  SELECT *
  FROM users
  WHERE lower(uname) = lower(${'nisha42'})
    AND faveFood = ANY (${['kibble', 'tuna']})
`
```

into the sql bindings + params tuple that node-postgres expects:

``` javascript
[ Symbol('$tagged'),
  `
    SELECT *
    FROM users
    WHERE lower(uname) = lower($1)
      AND faveFood = ANY ($2)
  `,
  ['nisha42', ['kibble', 'tuna']]
]
```

The first element of the tuple is an internal value that pg-extra checks for
when you pass it into `query`/`many`/`one`.

- If `{ q: true }`, all queries are required to be generated with
  the `q` tag and will otherwise fail.
- If `{ q: false }`, queries generated with the `q` tag will fail.

I'm trying to figure out a better API, but the objective here is to prohibit the
catastrophic case where you forget to tag your query with `q` which
will mean your query degrades into dumb string interpolation and thus
a possible sql injection vulnerability.

## Test

Setup local postgres database with seeded rows that the tests expect:

    createdb pg-extra-test
    psql pg-extra-test
    create table bars (n int not null);
    insert into bars (n) values (1), (2), (3);

Then run the tests:

    npm test

## TODO

- Rethink the API so that `q` queries and `(sql, params)` queries can
  live alongside each other. Right now the nasty global prototype overload
  prevents this.
- Test `pg.Client`.
