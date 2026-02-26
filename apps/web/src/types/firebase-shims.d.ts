declare module 'firebase/app' {
  export function initializeApp(config: any): any
  const app: any
  export default app
}

declare module 'firebase/auth' {
  export type User = any
  export function getAuth(app?: any): any
  export function createUserWithEmailAndPassword(...args: any[]): Promise<any>
  export function signInWithEmailAndPassword(...args: any[]): Promise<any>
  export function signOut(...args: any[]): Promise<any>
  export function onAuthStateChanged(...args: any[]): any
  export const GoogleAuthProvider: any
  export function signInWithPopup(...args: any[]): Promise<any>
  export function sendPasswordResetEmail(...args: any[]): Promise<any>
  export function updateProfile(...args: any[]): Promise<any>
}

declare module 'firebase/firestore' {
  export function getFirestore(app?: any): any
  export type Timestamp = any
  export function doc(...args: any[]): any
  export function setDoc(...args: any[]): Promise<any>
  export function serverTimestamp(): any
  export function getDoc(...args: any[]): Promise<any>
  export function collection(...args: any[]): any
  export function query(...args: any[]): any
  export function orderBy(...args: any[]): any
  export function getDocs(...args: any[]): Promise<any>
}
