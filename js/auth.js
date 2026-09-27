import { auth }
from "./config.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

window.login =
async function(){

    const email =
        document.getElementById(
            "email"
        ).value;

    const password =
        document.getElementById(
            "password"
        ).value;

    try{
        await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        alert("Login Successful");

    }catch(err){
        alert(err.message);
    }
};

window.register =
async function(){

    const email =
        document.getElementById(
            "email"
        ).value;

    const password =
        document.getElementById(
            "password"
        ).value;

    try{
        await
        createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        alert("Account Created");

    }catch(err){
        alert(err.message);
    }
};

window.logout =
async function(){
    await signOut(auth);
};

onAuthStateChanged(
    auth,
    user=>{

        if(user){
            console.log(
                "Logged in:",
                user.email
            );
        }
    }
);