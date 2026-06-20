import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDPlaceholder_REPLACE_ME",
  authDomain: "altimetria-web-app.firebaseapp.com",
  projectId: "altimetria-web-app",
  storageBucket: "altimetria-web-app.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:placeholder"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();

export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}
