import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyC-CH4zWzkivvwFYRz96_yzXuAXqutk4r8',
  authDomain: 'lawbrain-c4581.firebaseapp.com',
  projectId: 'lawbrain-c4581',
  storageBucket: 'lawbrain-c4581.firebasestorage.app',
  messagingSenderId: '18327491020',
  appId: '1:18327491020:web:6d1508b1259241a5350d69',
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export default app
