
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyC-LZHKVdzjPuTSGfrQKEyl5aGLsV5j6Fg",
  authDomain: "proyectum.firebaseapp.com",
  projectId: "proyectum",
  storageBucket: "proyectum.appspot.com",
  messagingSenderId: "147443356606",
  appId: "1:147443356606:web:7c35400d8542655c235fef",
  measurementId: ""
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app);

export { db, storage, auth };
