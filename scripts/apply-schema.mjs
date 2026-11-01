#!/usr/bin/env node
/**
 * Applies supabase/schema.sql to the project database.
 *
 * The schema is written to be idempotent (create if not exists / drop policy
 * before create), so re-running it is safe.
 *
 * Needs a direct Postgres connection, which the anon key cannot provide:
 *   SUPABASE_DB_URL=postgresql://postgres.<ref>:<password>@<host>:5432/postgres
 *
 * Supabase dashboard > Project Settings > Database > Connection string > URI.
 * Use the session pooler URI if direct connection is IPv6-only.
 *
 *   node scripts/apply-schema.mjs [path/to/file.sql]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'

try {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
} catch {
  /* environment only */
}

const url = process.env.SUPABASE_DB_URL
if (!url) {
  console.error('SUPABASE_DB_URL is not set.\n')
  console.error('Supabase dashboard > Project Settings > Database > Connection string > URI,')
  console.error('then add it to .env.local as SUPABASE_DB_URL=postgresql://...')
  process.exit(1)
}

const file = process.argv[2] ?? 'supabase/schema.sql'
const sql = readFileSync(resolve(process.cwd(), file), 'utf8')

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  // Supabase can be slow to accept a cold pooler connection.
  connectionTimeoutMillis: 30_000,
})

try {
  await client.connect()
  console.log(`Connected. Applying ${file} (${sql.split('\n').length} lines)...\n`)

  // One statement per call would break on the dollar-quoted function bodies,
  // so the file is sent whole and wrapped in a transaction.
  await client.query('begin')
  await client.query(sql)
  await client.query('commit')

  const { rows: tables } = await client.query(
    `select tablename from pg_tables where schemaname = 'public' order by tablename`,
  )
  const { rows: policies } = await client.query(
    `select tablename, count(*)::int as n from pg_policies where schemaname = 'public' group by tablename order by tablename`,
  )
  const { rows: buckets } = await client.query(`select id, public from storage.buckets order by id`)

  console.log('Tables:')
  tables.forEach((t) => console.log(`  ${t.tablename}`))
  console.log('\nRLS policies:')
  policies.forEach((p) => console.log(`  ${p.tablename}: ${p.n}`))
  console.log('\nStorage buckets:')
  buckets.forEach((b) => console.log(`  ${b.id} (public: ${b.public})`))
  console.log('\nSchema applied.')
} catch (err) {
  try {
    await client.query('rollback')
  } catch {
    /* connection may already be gone */
  }
  console.error('\nFailed:', err.message)
  if (err.position) console.error('at character', err.position)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
