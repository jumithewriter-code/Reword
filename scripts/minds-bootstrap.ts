import { query } from '../lib/db.ts'
import { status } from '../lib/minds.ts'
const users=await query(db=>db.users.map(({id,email,mindsId})=>({id,email,mindsId})))
for(const user of users)console.log(user.email,await status(user.mindsId))
