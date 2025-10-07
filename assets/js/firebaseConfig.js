import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyCLkkz5Od1xtsmV_BOnaDA2cvFbFZNp_qU",
  authDomain: "adbeam-recycling.firebaseapp.com",
  projectId: "adbeam-recycling",
  storageBucket: "adbeam-recycling.firebasestorage.app",
  messagingSenderId: "696108774998",
  appId: "1:696108774998:web:d5c2f7880a250c28c76df7",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
