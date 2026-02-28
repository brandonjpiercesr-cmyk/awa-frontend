import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDCq39PympTHCU7gFlIOm6xJYbtS7Amm9g",
  authDomain: "gmg-university.firebaseapp.com",
  projectId: "gmg-university",
  storageBucket: "gmg-university.firebasestorage.app",
  messagingSenderId: "85247972370",
  appId: "1:85247972370:web:18e62a01313037292d74cb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
}

export async function signOutUser() {
  return signOut(auth);
}
