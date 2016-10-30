
# pg-extra [![Build Status](https://travis-ci.org/danneu/pg-extra.svg?branch=master)](https://travis-ci.org/danneu/pg-extra) [![NPM version](https://badge.fury.io/js/pg-extra.svg)](http://badge.fury.io/js/pg-extra) [![Dependency Status](https://david-dm.org/danneu/pg-extra.svg)](https://david-dm.org/danneu/pg-extra)

A simple set of extensions and helpers for node-postgres.

- Extends pg.Pool with prototype methods `many`, `one`, `withTransaction`.
- Extends pg.Client with prototype methods `many`, `one`.
- Extends both with `.prepared(name).{query,many,one}()`
- The above methods all return promises just like
  the existing `pool.query()` and `client.query()`.
- Configures the client parser to parse postgres ints and numerics
  into javascript numbers (else `SELECT 1::int8` would return a string "1").
- `parseUrl` converts a postgres connection string into the object
  that pg.Pool expects.
- Exposes a `q` template literal helper for writing queries.

    ``` javascript
    const uname = 'nisha42'

    await pool.one(q`
      SELECT *
      FROM users
      WHERE lower(uname) = lower(${uname})
    `)
    ```
- All query methods fail if the query you pass in is not built with the
  `q` tag. This avoids the issue of accidentally introducting sql injection
  by forgetting `q` in front of a template literal.

## Install

    npm install --save pg-extra pg

## Usage / Example

``` javascript
const {extend, q, parseUrl} = require('pg-extra')
const pg = extend(require('pg'))

const url = 'postgres://user:pass@localhost:5432/my-db'

const pool = new pg.Pool(Object.assign(parseUrl(url), {
  ssl: true
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
    WHERE city = ANY (${cities})
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

- ``pool.query(q`sql`)``: Resolves a postgres Result.
- ``pool.many(q`sql`)``: Resolves an array of rows.
- ``pool.one(q`sql`)``: Resolves one row or null.
- ``client.query(q`sql`)``: Resolves a postgres Result.
- ``client.many(q`sql`)``: Resolves an array of rows.
- ``client.one(q`sql`)``: Resolves one row or null.
- ``{pool,client}.prepared('funcName').query(q`sql`)``
- ``{pool,client}.prepared('funcName').many(q`sql`)``
- ``{pool,client}.prepared('funcName').one(q`sql`)``
- `{pool,client}._query(sql, [params], [cb])`: The original .query() method.
  Useful when you want to bypass the `q` requirement, like when
  executing sql files.


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

into the sql bindings object that node-postgres expects:

``` javascript
{
  text: `
    SELECT *
    FROM users
    WHERE lower(uname) = lower($1)
      AND faveFood = ANY ($2)
  `,
  values: ['nisha42', ['kibble', 'tuna']]
}
```

## Test

Setup local postgres database with seeded rows that the tests expect:

    $ createdb pg_extra_test
    $ psql pg_extra_test
    $ psql -d pg_extra_test -c 'create table bars (n int not null);'
    $ psql -d pg_extra_test -c 'insert into bars (n) values (1), (2), (3);'

Then run the tests:

    npm test

## TODO

- Add `withTransaction` to `pg.Client`.
