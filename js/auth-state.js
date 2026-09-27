// js/auth-state.js
import { auth, db } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    const loginBtn = document.getElementById("loginBtn");
    const desktopUserBadge = document.getElementById("desktopUserBadge");
    const mobileAuthBlock = document.getElementById("mobileAuthBlock");
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");
    const navDashboardLink = document.getElementById("navDashboardLink");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (loginBtn) loginBtn.style.display = "none";
            if (desktopUserBadge) desktopUserBadge.style.display = "flex";
            if (mobileAuthBlock) mobileAuthBlock.style.display = "flex";
            if (mobileLogoutBtn) mobileLogoutBtn.style.display = "block";
            
            const userDoc = await getDoc(doc(db, "users", user.uid));
            let userName = "Johar User";
            let pfpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=08fb8f&color=000`; 

            if (userDoc.exists()) {
                const data = userDoc.data();
                userName = data.name || userName;
                pfpUrl = data.pfp || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=08fb8f&color=000&bold=true`;
                
                // Dashboard injection if admin
                if(data.role === "admin" && navDashboardLink) {
                    navDashboardLink.style.display = "inline-flex";
                }
            }

            if(document.getElementById("desktopUserName")) {
                document.getElementById("desktopUserName").textContent = userName.split(" ")[0]; 
                document.getElementById("desktopPfp").src = pfpUrl;
            }

            if(document.getElementById("mobileUserName")) {
                document.getElementById("mobileUserName").textContent = userName;
                document.getElementById("mobileEmail").textContent = user.email;
                document.getElementById("mobilePfp").src = pfpUrl;
            }

        } else {
            if (loginBtn) loginBtn.style.display = "inline-flex";
            if (desktopUserBadge) desktopUserBadge.style.display = "none";
            if (mobileAuthBlock) mobileAuthBlock.style.display = "none";
            if (mobileLogoutBtn) mobileLogoutBtn.style.display = "none";
            if (navDashboardLink) navDashboardLink.style.display = "none";
        }
    });

    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await signOut(auth);
                window.location.reload();
            } catch (error) {
                console.error("Logout Error:", error);
            }
        });
    }
});