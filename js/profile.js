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