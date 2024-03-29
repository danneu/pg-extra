# pg-extra [![Build Status](https://travis-ci.org/danneu/pg-extra.svg?branch=master)](https://travis-ci.org/danneu/pg-extra) [![NPM version](https://badge.fury.io/js/pg-extra.svg)](http://badge.fury.io/js/pg-extra) [![Dependency Status](https://david-dm.org/danneu/pg-extra.svg)](https://david-dm.org/danneu/pg-extra)

> Requires Node 8.x+ and pg 7.3+.

A simple set of extensions and helpers for [node-postgres][node-postgres].

## Quick Overview

-   Does not mutate `pg` module prototypes.
-   `extend(require('pg'))` creates `pg.extra` namespace with `pg.extra.Pool` and `pg.extra.Client`.
-   Extends `pg.extra.Pool` with prototype methods `many`, `one`, `withTransaction`, `stream`.
-   Extends `pg.extra.Client` with prototype methods `many`, `one`.
-   Extends both with `.prepared(name).{query,many,one}()`
-   The above methods all return promises just like
    the existing `pool.query()` and `client.query()`.
-   Configures the client parser to parse postgres ints and numerics
    into javascript numbers (else `SELECT 1::int8` would return a string "1").
-   Exposes `sql` and `_raw` template literal helpers for writing queries.

    ```javascript
    const uname = 'nisha42'
    const key = 'uname'
    const direction = 'desc'

    await pool.one(
        sql`
      SELECT *
      FROM users
      WHERE lower(uname) = lower(${uname})
    `.append(_raw`ORDER BY ${key} ${direction}`)
    )
    ```

-   All query methods fail if the query you pass in is not built with the
    `sql` or `_raw` tag. This avoids the issue of accidentally introducing
    sql injection with template literals. If you want normal template literal
    behavior (dumb interpolation), you must tag it with `_raw`.

## Install

    npm install --save pg-extra pg

## Usage / Example

```javascript
const { extend, sql, _raw } = require('pg-extra')
const pg = extend(require('pg'))

const connectionString = 'postgres://user:pass@localhost:5432/my-db'

const pool = new pg.extra.Pool({ connectionString, ssl: true })

exports.findUserByUname = async function(uname) {
    return pool.one(sql`
    SELECT *
    FROM users
    WHERE lower(uname) = lower(${uname})
  `)
}

exports.listUsersInCities = async function(cities, direction = 'DESC') {
    return pool.many(
        sql`
    SELECT *
    FROM users
    WHERE city = ANY (${cities})
  `.append(_raw`ORDER BY uname ${direction}`)
    )
}

exports.transferBalance = async function(from, to, amount) {
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

### Streaming

Return a readable stream of query results.

In this example, we want to stream all of the usernames in the
database to the browser.

-   `pool.stream()` returns `Promise<stream.Readable>` rather than just `stream.Readable`.
-   Provide an optional second argument to transform each row.

```javascript
const { _raw } = require('pg-extra')

router.get('/usernames', async (ctx) => {
    const stream = await pool.stream(
        _raw`
        SELECT uname
        FROM users
        ORDER BY uname
    `,
        (row) => row.uname
    )

    ctx.body = stream
})
```

## Extensions

-   `` pool.query(sql`string`) ``: Resolves a postgres Result.
-   `` pool.many(sql`string`) ``: Resolves an array of rows.
-   `` pool.one(sql`string`) ``: Resolves one row or null.
-   `` client.query(sql`string`) ``: Resolves a postgres Result.
-   `` client.many(sql`string`) ``: Resolves an array of rows.
-   `` client.one(sql`string`) ``: Resolves one row or null.
-   `` {pool,client}.prepared('funcName').query(sql`string`) ``
-   `` {pool,client}.prepared('funcName').many(sql`string`) ``
-   `` {pool,client}.prepared('funcName').one(sql`string`) ``
-   `{pool,client}._query(sql, [params], [cb])`: The original .query() method.
    Useful when you want to bypass the `sql`/`_raw` requirement, like when
    executing sql files.

### Query template tags

pg-extra forces you to tag template strings with `sql` or `_raw`.
You usually use `sql`.

`sql` is a simple helper that translates this:

```javascript
sql`
  SELECT *
  FROM users
  WHERE lower(uname) = lower(${'nisha42'})
    AND faveFood = ANY (${['kibble', 'tuna']})
`
```

into the sql bindings object that node-postgres expects:

```javascript
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

`_raw` is how you opt-in to regular string interpolation, made ugly
so that it stands out.

Use `.append()` to chain on to the query. The argument to `.append()`
must also be tagged with `sql` or `_raw`.

```javascript
sql`${'foo'} ${'bar'}`.append(_raw`${'baz'}`) // '$1 $2 baz'
_raw`${'foo'} ${'bar'}`.append(sql`${'baz'}`) // 'foo bar $1'
```

`.append()` mutates the sql statement object, but you can use `.clone()`
to create a deep copy of an existing instance.

```javascript
const statement1 = sql`SELECT 100`
const statement2 = statement1.clone().append(sql`, 200`)

statement1.text === 'SELECT 100'
statement2.text === 'SELECT 100 , 200'
```

## Cookbook

### Dynamic Queries

Reply to issue: <https://github.com/danneu/pg-extra/issues/1>

Let's say you want to bulk-insert:

```sql
INSERT INTO users (username)
VALUES
('john'),
('jack'),
('jill');
```

...And you want to be able to use your bulk-insert query whether you're
inserting one or one hundred records.

I recommend using a SQL-generator like [knex][knex]:

```javascript
const knex = require('knex')({ client: 'pg' })
const { extend, _raw } = require('pg-extra')
const pg = extend(require('pg'))

const pool = new pg.extra.Pool({
    connectionString: 'postgres://user:pass@localhost:5432/my-db',
})

// `usernames` will look like ['jack', 'jill', 'john']
exports.insertUsers = function(usernames) {
    const sqlString = knex('users')
        // we want to pass [{ username: 'jack' }, { username: 'john' }, ...]
        // to the .insert() function, which is a mapping of column names
        // to values.
        .insert(usernames.map((username) => ({ username })))
        .toString()
    return pool.query(_raw`${sqlString}`)
}
```

**Note**: Or you can circumvent pg-extra entirely with `pool._query(string)`.

## Test

Setup local postgres database with seeded rows that the tests expect:

    $ createdb pg_extra_test
    $ psql -d pg_extra_test -c 'create table bars (n int not null);'
    $ psql -d pg_extra_test -c 'insert into bars (n) values (1), (2), (3);'

Then run the tests:

    npm test

## CHANGELOG

-   **v2.0.0**:
    -   `extend(require('pg'))` now creates extended Pool/Client in a `pg.extra.{Pool,Client}`
        namespace instead of mutating pg's prototypes.
-   **v1.1.0**:
    -   Added `SqlStatement#clone()`.
-   **v1.0.0**:
    -   Deprecated `q` and `_unsafe`.
    -   Added bindings reuse optimization.

## TODO

-   Add `withTransaction()` to `pg.extra.Client`.
-   Add `stream()` to `pg.extra.Client`.

[node-postgres]: https://github.com/brianc/node-postgres
[knex]: http://knexjs.org/
