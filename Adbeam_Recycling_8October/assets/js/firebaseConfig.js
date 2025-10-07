// Import the functions you need from the SDKs you need
//import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
//import { getFirestore } from "firebase/firestore"

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";import { getStorage } from "firebase/storage"

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCLkkz5Od1xtsmV_BOnaDA2cvFbFZNp_qU",
  authDomain: "adbeam-recycling.firebaseapp.com",
  projectId: "adbeam-recycling",
  storageBucket: "adbeam-recycling.firebasestorage.app",
  messagingSenderId: "696108774998",
  appId: "1:696108774998:web:d5c2f7880a250c28c76df7",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase services
export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)
export default app
