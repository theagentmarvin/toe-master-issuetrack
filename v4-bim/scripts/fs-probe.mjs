import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSy…oi_g',
  authDomain: 'marvin-dev-c4ca4.firebaseapp.com',
  projectId: 'marvin-dev-c4ca4',
})
const db = getFirestore(app)
for (const c of ['projects', 'people']) {
  try {
    const snap = await getDocs(collection(db, c))
    console.log(`${c}: OK, ${snap.size} docs`)
  } catch (e) {
    console.log(`${c}: FAIL ${e.code || ''} ${e.message.slice(0, 80)}`)
  }
}
process.exit(0)
