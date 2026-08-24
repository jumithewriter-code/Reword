import { promises as fs } from 'node:fs'
import path from 'node:path'
import { Pool, type PoolClient } from 'pg'
import type { Database } from './types'

const empty: Database = { users: [], memories: [], suggestions: [], projects: [] }
const file = process.env.REWORD_DATA_FILE || path.join(process.cwd(), '.data', 'reword.json')
let chain = Promise.resolve()
let pool: Pool | undefined
let schemaReady: Promise<void> | undefined

function postgres() {
  if (!process.env.DATABASE_URL) return undefined
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 3 })
  return pool
}

function ensureSchema(db: Pool) {
  schemaReady ??= db.query(`
    CREATE TABLE IF NOT EXISTS reword_state (
      id smallint PRIMARY KEY CHECK (id = 1),
      data jsonb NOT NULL,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  `).then(() => undefined)
  return schemaReady
}

async function readPostgres(db: Pool | PoolClient): Promise<Database> {
  const result = await db.query<{ data: Database }>('SELECT data FROM reword_state WHERE id = 1')
  return result.rows[0]?.data ?? structuredClone(empty)
}

async function read(): Promise<Database> {
  try { return JSON.parse(await fs.readFile(file, 'utf8')) as Database }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    return structuredClone(empty)
  }
}

async function write(data: Database) {
  await fs.mkdir(path.dirname(file), { recursive: true })
  const temp = `${file}.${process.pid}.tmp`
  await fs.writeFile(temp, JSON.stringify(data, null, 2))
  await fs.rename(temp, file)
}

export async function query<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  const db = postgres()
  if (!db) return fn(await read())
  await ensureSchema(db)
  return fn(await readPostgres(db))
}

export async function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  let result!: T
  const operation = chain.then(async () => {
    const db = postgres()
    if (!db) {
      const data = await read()
      result = await fn(data)
      await write(data)
      return
    }

    await ensureSchema(db)
    const client = await db.connect()
    try {
      await client.query('BEGIN')
      await client.query(
        'INSERT INTO reword_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING',
        [JSON.stringify(empty)],
      )
      const locked = await client.query<{ data: Database }>('SELECT data FROM reword_state WHERE id = 1 FOR UPDATE')
      const data = locked.rows[0]?.data ?? structuredClone(empty)
      result = await fn(data)
      await client.query('UPDATE reword_state SET data = $1::jsonb, updated_at = now() WHERE id = 1', [JSON.stringify(data)])
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  })
  chain = operation.catch(() => undefined)
  await operation
  return result
}
export function makeId(prefix: string) { return `${prefix}_${crypto.randomUUID()}` }
