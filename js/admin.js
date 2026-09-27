import { auth, db }
from "./config.js";

import {
    onAuthStateChanged
}
from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";

import {
    doc,
    getDoc
}
from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

onAuthStateChanged(
    auth,
    async user=>{

        if(!user){

            location.href =
                "../index.html";

            return;
        }

        const userRef =
            doc(
                db,
                "users",
                user.uid
            );

        const snap =
            await getDoc(
                userRef
            );

        if(
            !snap.exists()
        ){
            location.href =
                "../index.html";

            return;
        }

        const data =
            snap.data();

        if(
            data.role
            !==
            "admin"
        ){
            location.href =
                "../index.html";
        }
    }
);