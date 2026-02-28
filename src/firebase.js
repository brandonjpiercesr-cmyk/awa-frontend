// ⬡B:myaba.firebase:CONFIG:auth:v1.2.0:20260225⬡
// MyABA v1.2.0 — Firebase for AUTH ONLY
// ════════════════════════════════════════════════════════════════════════════
// ARCHITECTURE:
//   - Firebase = AUTH (Google sign-in only)
//   - Conversations = AIR → Supabase (see MyABA.jsx)
//   - DO NOT add Firestore conversation functions here
// ════════════════════════════════════════════════════════════════════════════

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyAD5sW9y0RriF8HsyS7twfd0bjgA2dGsQw",
  authDomain: "aba-central-brain.firebaseapp.com",
  databaseURL: "https://aba-central-brain-default-rtdb.firebaseio.com",
  projectId: "aba-central-brain",
  storageBucket: "aba-central-brain.firebasestorage.app",
  messagingSenderId: "280046049526",
  appId: "1:280046049526:web:4021ec007ca79c0e0cf4d7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export async function signInGoogle() {
  return signInWithPopup(auth, googleProvider);
}

export async function signOutUser() {
  return signOut(auth);
}

// ════════════════════════════════════════════════════════════════════════════
// NOTE: All conversation persistence routes through AIR → Supabase
// Functions: airSaveConversation, airLoadConversations, airDeleteConversation
// Location: MyABA.jsx
// ════════════════════════════════════════════════════════════════════════════
