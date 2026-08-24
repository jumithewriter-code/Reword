import { mkdir, access, writeFile } from 'node:fs/promises'
import path from 'node:path'
const target=process.env.REWORD_DATA_FILE||path.join(process.cwd(),'.data','reword.json')
await mkdir(path.dirname(target),{recursive:true})
try{await access(target);console.log(`Data store already exists: ${target}`)}catch{await writeFile(target,JSON.stringify({users:[],memories:[],suggestions:[],projects:[]},null,2));console.log(`Initialized data store: ${target}`)}
