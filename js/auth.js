// js/auth.js
import { auth, db } from "./config.js";
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("login-form");
    const signupForm = document.getElementById("signup-form");

    // ================= LOGIN WORKFLOW =================
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("login-email").value;
            const password = document.getElementById("login-password").value;
            const btn = loginForm.querySelector(".auth-submit");
            const originalText = btn.innerHTML;
            
            btn.innerHTML = '<span>Verifying...</span> <i class="ri-loader-4-line ri-spin"></i>';
            try {
                await signInWithEmailAndPassword(auth, email, password);
                window.location.href = "index.html";
            } catch (error) {
                alert("Login Failed: " + error.message);
                btn.innerHTML = originalText;
            }
        });
    }

    // ================= SIGNUP WORKFLOW =================
    if (signupForm) {
        signupForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("signup-name").value;
            const email = document.getElementById("signup-email").value;
            const password = document.getElementById("signup-password").value;
            const btn = signupForm.querySelector(".auth-submit");
            const originalText = btn.innerHTML;

            btn.innerHTML = '<span>Creating Account...</span> <i class="ri-loader-4-line ri-spin"></i>';
            try {
                // Step 1: Create user in Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Step 2: Save user details in Firestore
                await setDoc(doc(db, "users", user.uid), {
                    name: name,
                    email: email,
                    role: "customer",
                    createdAt: new Date()
                });

                alert("Account successfully created! Welcome to Johar Hub.");
                window.location.href = "index.html";
            } catch (error) {
                console.error("Signup error details:", error);
                alert("Signup Failed: " + error.message);
                btn.innerHTML = originalText;
            }
        });
    }
});