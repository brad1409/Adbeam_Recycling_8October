import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// Save form data to Firestore
async function saveUser() {
  const name = document.getElementById("name").value;
  const email = document.getElementById("email").value;

  await addDoc(collection(db, "users"), { name, email });
  alert("User added to Firestore!");
}

// Load users
async function loadUsers() {
  const querySnapshot = await getDocs(collection(db, "users"));
  querySnapshot.forEach((doc) => {
    console.log(`${doc.id} =>`, doc.data());
  });
}

window.saveUser = saveUser;
window.loadUsers = loadUsers;
