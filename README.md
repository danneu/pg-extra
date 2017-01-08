
# pg-extra [![Build Status](https://travis-ci.org/danneu/pg-extra.svg?branch=master)](https://travis-ci.org/danneu/pg-extra) [![NPM version](https://badge.fury.io/js/pg-extra.svg)](http://badge.fury.io/js/pg-extra) [![Dependency Status](https://david-dm.org/danneu/pg-extra.svg)](https://david-dm.org/danneu/pg-extra)

A simple set of extensions and helpers for node-postgres.

## Quick Overview

- Extends pg.Pool with prototype methods `many`, `one`, `withTransaction`.
- Extends pg.Client with prototype methods `many`, `one`.
- Extends both with `.prepared(name).{query,many,one}()`
- The above methods all return promises just like
  the existing `pool.query()` and `client.query()`.
- Configures the client parser to parse postgres ints and numerics
  into javascript numbers (else `SELECT 1::int8` would return a string "1").
- `parseUrl` converts a postgres connection string into the object
  that pg.Pool expects.
- Exposes `sql` and `_unsafe` template literal helpers for writing queries.

    ``` javascript
    const uname = 'nisha42'
    const key = 'uname'
    const direction = 'desc'

    await pool.one(sql`
      SELECT *
      FROM users
      WHERE lower(uname) = lower(${uname})
    `.append(_unsafe`ORDER BY ${key} ${direction}`))
    ```
- All query methods fail if the query you pass in is not built with the
  `sql` or `_unsafe` tag. This avoids the issue of accidentally introducing
  sql injection with template literals. If you want normal template literal
  behavior (dumb interpolation), you must tag it with `_unsafe`.

## Install

    npm install --save pg-extra pg

## Usage / Example

``` javascript
const {extend, sql, _unsafe, parseUrl} = require('pg-extra')
const pg = extend(require('pg'))

const url = 'postgres://user:pass@localhost:5432/my-db'

const pool = new pg.Pool(Object.assign(parseUrl(url), {
  ssl: true
}))

exports.findUserByUname = async function (uname) {
  return pool.one(sql`
    SELECT *
    FROM users
    WHERE lower(uname) = lower(${uname})
  `)
}

exports.listUsersInCities = async function (cities, direction = 'DESC') {
  return pool.many(sql`
    SELECT *
    FROM users
    WHERE city = ANY (${cities})
  `.append(_unsafe`ORDER BY uname ${direction}`))
}

exports.transferBalance = async function (from, to, amount) {
  return pool.withTransaction(async (client) => {
    await client.query(sql`
      UPDATE accounts SET amount = amount - ${amount} WHERE id = ${from}
    `)
    await client.query(sql`
      UPDATE accounts SET amount = amount + ${amount} WHERE id = ${to}
    `)
  })
}
```

## Extensions

- ``pool.query(sql`string`)``: Resolves a postgres Result.
- ``pool.many(sql`string`)``: Resolves an array of rows.
- ``pool.one(sql`string`)``: Resolves one row or null.
- ``client.query(sql`string`)``: Resolves a postgres Result.
- ``client.many(sql`string`)``: Resolves an array of rows.
- ``client.one(sql`string`)``: Resolves one row or null.
- ``{pool,client}.prepared('funcName').query(sql`string`)``
- ``{pool,client}.prepared('funcName').many(sql`string`)``
- ``{pool,client}.prepared('funcName').one(sql`string`)``
- `{pool,client}._query(sql, [params], [cb])`: The original .query() method.
  Useful when you want to bypass the `sql`/`_unsafe` requirement, like when
  executing sql files.


### Query template tags

pg-extra forces you to tag template strings with `sql` or `_unsafe`.
You usually use `sql`.

`sql` is a simple helper that translates this:

``` javascript
sql`
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

`_unsafe` is how you opt-in to regular string interpolation, made ugly
so that it stands out.

Use `.append()` to chain on to the query. The argument to `.append()`
must also be tagged with `sql` or `_unsafe`.


``` javascript
sql`${'foo'} ${'bar'}`.append(_unsafe`${'baz'}`) // '$1 $2 baz'
_unsafe`${'foo'} ${'bar'}`.append(sql`${'baz'}`) // 'foo bar $1'
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
