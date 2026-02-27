import { getApps, initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function initializeAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.ADMIN_PROJECT_ID
  const clientEmail = process.env.ADMIN_CLIENT_EMAIL
  const privateKey = process.env.ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (projectId && clientEmail && privateKey) {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    })
  }

  return initializeApp()
}

const app = initializeAdminApp()

export const adminDb = getFirestore(app)
