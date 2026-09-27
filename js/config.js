import { initializeApp }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";

import { getAuth }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import { getFirestore }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

import { getStorage }
from "https://www.gstatic.com/firebasejs/12.0.0/firebase-storage.js";

const firebaseConfig = {
    apiKey: "AIzaSyDa2BPadbGoD569ObwKrGR5oWT8guzx5W0",
  authDomain: "johar-hub.firebaseapp.com",
  projectId: "johar-hub",
  storageBucket: "johar-hub.firebasestorage.app",
  messagingSenderId: "210373758278",
  appId: "1:210373758278:web:ddeba056f22bd79c89a947",
  measurementId: "G-E723GPGY65"
};

const app =
    initializeApp(firebaseConfig);

export const auth =
    getAuth(app);

export const db =
    getFirestore(app);

export const storage =
    getStorage(app);