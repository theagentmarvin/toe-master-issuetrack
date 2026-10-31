/* Static proof (no Firestore write): serverTimestamp() must be attached
   AFTER the JSON sanitize, or it is destroyed into a literal map. */
import { serverTimestamp } from 'firebase/firestore'

const sentinel = serverTimestamp()

// OLD behaviour (bug): sentinel inside the object that gets sanitized.
const oldDef = { name: 'V', finderQuery: { data: [] }, colorizations: [] }
const oldPayload = JSON.parse(JSON.stringify({ ...oldDef, createdAt: sentinel }))
console.log('OLD  createdAt after sanitize:', JSON.stringify(oldPayload.createdAt))

// NEW behaviour (fix): sanitize FIRST, then attach the sentinel.
const clean = JSON.parse(JSON.stringify(oldDef))
const newPayload = { ...clean, createdAt: sentinel, updatedAt: sentinel }
console.log('NEW  createdAt is the live sentinel object:', newPayload.createdAt === sentinel)
console.log('NEW  createdAt._methodName                :', newPayload.createdAt._methodName)
console.log('NEW  clean fields intact                   :', JSON.stringify(clean))
