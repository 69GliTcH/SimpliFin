// src/lib/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyDcqSbANZ-RPgVSVyV-eUSZe2fi43UC5_Q",
    authDomain: "simplifinan.firebaseapp.com",
    projectId: "simplifinan",
    storageBucket: "simplifinan.appspot.com",
    messagingSenderId: "167581966395",
    appId: "1:167581966395:web:274d20aa3c281852887c1e",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Create Google provider
const googleProvider = new GoogleAuthProvider();

// ✅ Export everything needed
export { auth, db, googleProvider };
