// ============================================================
//  FIREBASE CONFIG — GivingTuesday Meme Lab (Anonymous Mode)
//  No email. No passwords. Just chaos and kindness.
//  Replace values below with your own Firebase project.
//  See SETUP.md for full instructions.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth }       from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore }  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage }    from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔴 REPLACE THIS WITH YOUR FIREBASE CONFIG
const firebaseConfig = {

  apiKey: "AIzaSyC79OBJtEyhtkJOv51EpHQ-S_H9_yKaTd0",

  authDomain: "gtmemelab.firebaseapp.com",

  databaseURL: "https://gtmemelab-default-rtdb.firebaseio.com",

  projectId: "gtmemelab",

  storageBucket: "gtmemelab.firebasestorage.app",

  messagingSenderId: "521283918026",

  appId: "1:521283918026:web:7bf936e961df88721b7c33",

  measurementId: "G-H2MN8TGP1F"

};


const app = initializeApp(firebaseConfig);
export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);
