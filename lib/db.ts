import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Database } from './types'

const empty: Database = { users: [], memories: [], suggestions: [], projects: [] }
const file = process.env.REWORD_DATA_FILE || path.join(process.cwd(), '.data', 'reword.json')
let chain = Promise.resolve()

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

export async function query<T>(fn: (db: Database) => T | Promise<T>): Promise<T> { return fn(await read()) }
export async function mutate<T>(fn: (db: Database) => T | Promise<T>): Promise<T> {
  let result!: T
  const operation = chain.then(async () => { const db = await read(); result = await fn(db); await write(db) })
  chain = operation.catch(() => undefined)
  await operation
  return result
}
export function makeId(prefix: string) { return `${prefix}_${crypto.randomUUID()}` }
