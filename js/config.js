import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

// 1. Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyDa2BPadbGoD569ObwKrGR5oWT8guzx5W0",
    authDomain: "johar-hub.firebaseapp.com",
    projectId: "johar-hub",
    storageBucket: "johar-hub.firebasestorage.app",
    messagingSenderId: "210373758278",
    appId: "1:210373758278:web:ddeba056f22bd79c89a947",
    measurementId: "G-E723GPGY65"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// 2. Cloudflare R2 Storage Logic
const WORKER_URL = "https://johar-hub.dev-kumrekrishna.workers.dev";
const PUBLIC_URL = "https://pub-xxxxxx.r2.dev"; // Ise apne actual R2 public dev URL se replace karein

export const uploadFileToR2 = async (file, folder, customFileName) => {
    try {
        const ext = file.name.split('.').pop();
        const fileKey = `${folder}/${customFileName}.${ext}`;
        
        const response = await fetch(`${WORKER_URL}/${fileKey}`, {
            method: 'PUT',
            headers: { 'Content-Type': file.type },
            body: file
        });
        
        if (!response.ok) throw new Error('Upload failed');
        return `${PUBLIC_URL}/${fileKey}`; // Return the public URL for DB
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
};

export const uploadPfp = async (userId, file) => {
    return await uploadFileToR2(file, 'profiles', userId);
};