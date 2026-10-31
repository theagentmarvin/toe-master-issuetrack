/* =====================================================================
   IssueTrack — Firebase bootstrap (Wave B / Exam 3).
   The web config is PUBLIC client configuration (it ships in every
   browser bundle); access is controlled by the Firestore rules, which
   are in test mode for this demo (no authentication in Exam 3).
   ===================================================================== */
import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

export const firebaseConfig = {
  projectId: 'marvin-dev-c4ca4',
  appId: '1:500660140991:web:79628996fe65a8ea96ff0a',
  apiKey: 'AIzaSyA61h8b9R2cQxJqCEDzGDDFUe57dWRAoi_g',
  authDomain: 'marvin-dev-c4ca4.firebaseapp.com',
  messagingSenderId: '500660140991',
  storageBucket: 'marvin-dev-c4ca4.firebasestorage.app',
}

export const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)
