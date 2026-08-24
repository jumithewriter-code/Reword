import assert from 'node:assert/strict'
import test from 'node:test'
import { hashPassword, verifyPassword } from '../lib/security.ts'
import { generateContent } from '../lib/ai.ts'
import { outputKinds } from '../lib/types.ts'

test('password hashing verifies only the original password',()=>{const hash=hashPassword('correct horse battery staple');assert.equal(verifyPassword('correct horse battery staple',hash),true);assert.equal(verifyPassword('wrong',hash),false);assert.notEqual(hash,'correct horse battery staple')})
test('generation returns exactly the four confirmed formats without a provider key',async()=>{const previous=process.env.ANTHROPIC_API_KEY;delete process.env.ANTHROPIC_API_KEY;const result=await generateContent('A useful idea about building trust.',[]);assert.deepEqual(Object.keys(result),[...outputKinds]);for(const key of outputKinds)assert.ok(result[key]?.length);if(previous)process.env.ANTHROPIC_API_KEY=previous})
