import { auth }
from "./config.js";

import {
    onAuthStateChanged,
    signOut
}
from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

const profileSection =
document.getElementById(
    "profile"
);

onAuthStateChanged(
    auth,
    user=>{

        if(user){

            profileSection.innerHTML = `
                <div class="content-card">

                    <h2>
                        Welcome
                    </h2>

                    <p>
                        ${user.email}
                    </p>

                    <br>

                    <button
                        onclick="logout()"
                    >
                        Logout
                    </button>

                </div>
            `;

        }else{

            profileSection.innerHTML = `
                <div class="content-card">

                    <h2>Login</h2>

                    <input
                        id="email"
                        type="email"
                        placeholder="Email"
                    >

                    <input
                        id="password"
                        type="password"
                        placeholder="Password"
                    >

                    <button
                        onclick="login()"
                    >
                        Login
                    </button>

                    <br><br>

                    <button
                        onclick="register()"
                    >
                        Create Account
                    </button>

                </div>
            `;
        }

    }
);

window.logout =
async function(){

    await signOut(auth);

    alert(
        "Logged Out"
    );
};



// ==========================================
// JOHAR HUB PWA SERVICE WORKER
// ==========================================

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("/service-worker.js")
            .then(registration => {

                console.log(
                    "Johar Hub Service Worker registered:",
                    registration.scope
                );

                // New service worker available?
                registration.addEventListener(
                    "updatefound",
                    () => {

                        const newWorker =
                            registration.installing;

                        if (!newWorker) return;

                        newWorker.addEventListener(
                            "statechange",
                            () => {

                                if (
                                    newWorker.state === "installed" &&
                                    navigator.serviceWorker.controller
                                ) {

                                    console.log(
                                        "Johar Hub updated in background."
                                    );

                                }

                            }
                        );

                    }
                );

            })
            .catch(error => {

                console.error(
                    "Service Worker registration failed:",
                    error
                );

            });

    });

}