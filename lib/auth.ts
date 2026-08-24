import { createHash, randomBytes } from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { query } from './db'
import type { User } from './types'

const cookieName = 'reword_session'
const secret = () => new TextEncoder().encode(process.env.AUTH_SECRET || 'reword-dev-secret-change-me')
export { hashPassword, verifyPassword } from './security'
export async function issueSession(userId: string) {
  const token = await new SignJWT({ sub: userId }).setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime('30d').sign(secret())
  const jar = await cookies(); jar.set(cookieName, token, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30 })
}
export async function clearSession() { (await cookies()).delete(cookieName) }
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(cookieName)?.value; if (!token) return null
  try { const { payload } = await jwtVerify(token, secret()); return query(db => db.users.find(u => u.id === payload.sub) || null) } catch { return null }
}
export async function requireUser() { const user = await currentUser(); if (!user) throw new Response('Unauthorized', { status: 401 }); return user }
export function oauthState() { return createHash('sha256').update(randomBytes(32)).digest('hex') }
