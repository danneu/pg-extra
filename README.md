# pg-extra [![Build Status](https://travis-ci.org/danneu/pg-extra.svg?branch=master)](https://travis-ci.org/danneu/pg-extra) [![NPM version](https://badge.fury.io/js/pg-extra.svg)](http://badge.fury.io/js/pg-extra) [![Dependency Status](https://david-dm.org/danneu/pg-extra.svg)](https://david-dm.org/danneu/pg-extra)

> Requires Node 7.x+ and pg 7.3+.

A simple set of extensions and helpers for [node-postgres][node-postgres].

## Quick Overview

- Extends pg.Pool with prototype methods `many`, `one`, `withTransaction`, `stream`.
- Extends pg.Client with prototype methods `many`, `one`.
- Extends both with `.prepared(name).{query,many,one}()`
- The above methods all return promises just like
  the existing `pool.query()` and `client.query()`.
- Configures the client parser to parse postgres ints and numerics
  into javascript numbers (else `SELECT 1::int8` would return a string "1").
- `parseUrl` converts a postgres connection string into the object
  that pg.Pool expects.
- Exposes `sql` and `_raw` template literal helpers for writing queries.

    ``` javascript
    const uname = 'nisha42'
    const key = 'uname'
    const direction = 'desc'

    await pool.one(sql`
      SELECT *
      FROM users
      WHERE lower(uname) = lower(${uname})
    `.append(_raw`ORDER BY ${key} ${direction}`))
    ```
- All query methods fail if the query you pass in is not built with the
  `sql` or `_raw` tag. This avoids the issue of accidentally introducing
  sql injection with template literals. If you want normal template literal
  behavior (dumb interpolation), you must tag it with `_raw`.

## Install

    npm install --save pg-extra pg

## Usage / Example

``` javascript
const {extend, sql, _raw, parseUrl} = require('pg-extra')
const pg = extend(require('pg'))

const url = 'postgres://user:pass@localhost:5432/my-db'

const pool = new pg.Pool({ ...parseUrl(url), ssl: true })

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
  `.append(_raw`ORDER BY uname ${direction}`))
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

### Streaming

Return a readable stream of query results.

In this example, we want to stream all of the usernames in the
database to the browser.

- `pool.stream()` returns `Promise<stream.Readable>` rather than just `stream.Readable`.
- Provide an optional second argument to transform each row.

```javascript
const { _raw } = require('pg-extra')

router.get('/usernames', async ctx => {
    const stream = await pool.stream(_raw`
        SELECT uname
        FROM users
        ORDER BY uname
    `, (row) => row.uname)

    ctx.body = stream
})
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
  Useful when you want to bypass the `sql`/`_raw` requirement, like when
  executing sql files.

### Query template tags

pg-extra forces you to tag template strings with `sql` or `_raw`.
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

`_raw` is how you opt-in to regular string interpolation, made ugly
so that it stands out.

Use `.append()` to chain on to the query. The argument to `.append()`
must also be tagged with `sql` or `_raw`.

``` javascript
sql`${'foo'} ${'bar'}`.append(_raw`${'baz'}`) // '$1 $2 baz'
_raw`${'foo'} ${'bar'}`.append(sql`${'baz'}`) // 'foo bar $1'
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
const {extend, parseUrl, _raw} = require('pg-extra')
const pg = extend(require('pg'))

const pool = new pg.Pool(parseUrl('postgres://user:pass@localhost:5432/my-db'))

// `usernames` will look like ['jack', 'jill', 'john']
exports.insertUsers = function (usernames) {
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

## Why mutate `pg`?

This library works by mutating the `pg` module with `extend(require('pg'))`
to add and override its prototype methods.

This is generally something you want to avoid when writing Javascript
code. For example, I could have instead implemented this library as
regular functions that just take `Client`/`Pool` instances:

```javascript
const {one, many, query, withTransaction, sql, _raw} = require('pg-extra')

await one(client, sql`select * from users where id = ${id}`)

await many(pool, sql`select * from users`)

await withTransaction(async client => {
    const user = await one(client, sql`insert into users (uname) values (${uname})`)
    return query(client, sql`insert into profiles (user_id) values (${user.id})`)
})
```

Seems reasonable at a glance.

However, I decided against this because it would be too easy to introduce
SQL injection vulnerabilities when mixing and matching this library
with `pg`'s methods.

For example, this would be an easy and possible mistake:

```javascript
await withTransaction(async client => {
    const user = await client.query(`insert into users (uname) values (${uname})`)
    return query(client, sql`insert into profiles (user_id) values (${user.id})`)
})
```

Whoops, got used to `pg-extra`'s sweet string interpolation but accidentally used
`pg`'s `client.query()` method instead. Now you have a SQL injection vulnerability.

That's exactly the sort of mistake this library tries to prevent and I couldn't think
of a better implementation than mutating `pg`.

## Test

Setup local postgres database with seeded rows that the tests expect:

    $ createdb pg_extra_test
    $ psql -d pg_extra_test -c 'create table bars (n int not null);'
    $ psql -d pg_extra_test -c 'insert into bars (n) values (1), (2), (3);'

Then run the tests:

    npm test

## TODO

- Add `withTransaction()` to `pg.Client`.
- Add `stream()` to `pg.Client`.

[node-postgres]: https://github.com/brianc/node-postgres
[knex]: http://knexjs.org/
