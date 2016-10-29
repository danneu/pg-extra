
# pg-extra [![Build Status](https://travis-ci.org/danneu/pg-extra.svg?branch=master)](https://travis-ci.org/danneu/pg-extra) [![NPM version](https://badge.fury.io/js/pg-extra.svg)](http://badge.fury.io/js/pg-extra) [![Dependency Status](https://david-dm.org/danneu/pg-extra.svg)](https://david-dm.org/danneu/pg-extra)


Useful extensions to the node-postgres pool and client.

- Extends pg.Pool with prototype methods `many`, `one`, `withTransaction`.
- Extends pg.Client with prototype methods `many`, `one`.
- The above methods all return promises just like
  the existing `pool.query()` and `client.query()`.
- `parseUrl` converts a postgres connection string into the object
  that pg.Pool expects.
- Exposes a `q` template literal helper for writing queries.

    ``` javascript
    const uname = 'nisha42'

    await pool.one(...q`
      SELECT *
      FROM users
      WHERE lower(uname) = lower(${uname})
    `)
    ```

## Install

    npm install --save pg-extra pg

## Usage

``` javascript
const {extend, q, parseUrl} = require('pg-extra')
const pg = extend(require('pg'))

const url = 'postgres://user:pass@localhost:5432/my-db'
const pool = new pg.Pool(Object.assign(parseUrl(url), {
  ssl: true,
  // ...
}))

exports.findUserByUname = async function (uname) {
  return pool.one(...q`
    SELECT *
    FROM users
    WHERE lower(uname) = lower(${uname})
  `)
}

exports.listUsersInCities = async function (cities) {
  return pool.many(...q`
    SELECT *
    FROM users
    WHERE city = ANY(${cities})
  `)
}

exports.transferBalance = async function (from, to, amount) {
  return pool.withTransaction(async (client) => {
    await client.query(...q`
      UPDATE accounts SET amount = amount - ${amount} WHERE id = ${from}
    `)
    await client.query(...q`
      UPDATE accounts SET amount = amount + ${amount} WHERE id = ${to}
    `)
  })
}
```

## Extensions

### Without the `q` helper

- `pool.many(sql, params)`: Resolves an array of rows.
- `pool.one(sql, params)`: Resolves one row or null.
- `client.many(sql, params)`: Resolves an array of rows.
- `client.one(sql, params)`: Resolves one row or null.

### With the `q` helper

- ``pool.many(...q`sql`)``: Resolves an array of rows.
- ``pool.one(...q`sql`)``: Resolves one row or null.
- ``client.many(...q`sql`)``: Resolves an array of rows.
- ``client.one(...q`sql`)``: Resolves one row or null.

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
[ `
    SELECT *
    FROM users
    WHERE lower(uname) = lower($1)
      AND faveFood = ANY ($2)
  `,
  ['nisha42', ['kibble', 'tuna']]
]
```

## Test

Setup local postgres database with seeded rows that the tests expect:

    $ createdb pg_extra_test
    $ psql pg_extra_test
    create table bars (n int not null);
    insert into bars (n) values (1), (2), (3);

Then run the tests:

    npm test

## TODO

- Test `pg.Client`.
- Add `withTransaction` to `pg.Client`.
