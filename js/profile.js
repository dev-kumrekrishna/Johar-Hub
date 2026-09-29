import { auth, db, uploadPfp } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // Auth State & Load Real Data
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "auth.html";
            return;
        }

        const userRef = doc(db, "users", user.uid);
        
        try {
            const userDoc = await getDoc(userRef);

            if (userDoc.exists()) {
                const data = userDoc.data();
                
                // Populate Form Fields
                document.getElementById("mainProfileName").textContent = data.name || "Johar User";
                document.getElementById("mainProfileEmail").textContent = user.email;
                document.getElementById("profileNameInput").value = data.name || "";
                document.getElementById("profilePhoneInput").value = data.phone || "";
                document.getElementById("profileAddressInput").value = data.address || "";

                // PFP Logic - Cache Buster to force UI update from R2
                let finalPfpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=08fb8f&color=000`;
                if(data.pfp) {
                    finalPfpUrl = data.pfp + "?t=" + Date.now();
                }
                document.getElementById("mainProfilePic").src = finalPfpUrl;

                // Fetch real data
                renderUserOrders(user.uid);
                renderUserWishlist(user.uid);
            }
        } catch (error) {
            console.error("Profile load error:", error);
        }

        // PFP Upload Logic to Cloudflare R2
        const pfpUpload = document.getElementById('pfpUpload');
        if (pfpUpload) {
            pfpUpload.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const uploadLabel = document.getElementById("uploadLabel");
                uploadLabel.innerHTML = `<i class="ri-loader-4-line ri-spin"></i>`;
                
                // Upload to R2 Bucket
                const r2Url = await uploadPfp(user.uid, file);
                
                if(r2Url) {
                    // Update Database
                    await updateDoc(userRef, { pfp: r2Url });
                    
                    // Update UI immediately (Bypass Cloudflare cache)
                    const freshUrl = r2Url + "?t=" + Date.now();
                    document.getElementById("mainProfilePic").src = freshUrl;
                    
                    // Update header icons instantly
                    if(document.getElementById("desktopPfp")) document.getElementById("desktopPfp").src = freshUrl;
                    if(document.getElementById("mobilePfp")) document.getElementById("mobilePfp").src = freshUrl;

                    alert("Profile picture updated successfully!");
                } else {
                    alert("Upload failed. Try again.");
                }
                uploadLabel.innerHTML = `<i class="ri-pencil-line"></i>`;
            });
        }

        // Form Submit Logic for details
        const profileForm = document.getElementById("updateProfileForm");
        if (profileForm) {
            profileForm.addEventListener("submit", async (e) => {
                e.preventDefault();
                const btn = document.getElementById("updateBtn");
                btn.innerHTML = `Saving... <i class="ri-loader-4-line ri-spin"></i>`;

                const phone = document.getElementById("profilePhoneInput").value;
                const address = document.getElementById("profileAddressInput").value;

                try {
                    await updateDoc(userRef, { phone, address });
                    alert("Profile Updated Successfully!");
                } catch(err) {
                    console.error("Update error:", err);
                    alert("Error updating profile.");
                }
                btn.innerHTML = `Save Details`;
            });
        }
    });

    // Logout Functionality
    const logoutBtn = document.getElementById("logoutBtnProfile");
    if (logoutBtn) {
        logoutBtn.addEventListener("click", async () => {
            await signOut(auth);
            window.location.href = "index.html";
        });
    }

    // --- Fetch User Orders ---
    async function renderUserOrders(uid) {
        const container = document.getElementById("realOrdersContainer");
        if (!container) return;

        try {
            const q = query(collection(db, "orders"), where("userId", "==", uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                container.innerHTML = `<p style="color: var(--muted); grid-column: 1/-1;">You haven't placed any orders yet.</p>`;
                return;
            }

            container.innerHTML = "";
            querySnapshot.forEach((doc) => {
                const order = doc.data();
                container.innerHTML += `
                <div class="product-card glass-panel order-custom-card">
                    <div class="order-custom-header">
                        <span class="order-id-txt">#${doc.id.substring(0,8).toUpperCase()}</span>
                        <span class="status available">${order.status || 'PROCESSING'}</span>
                    </div>
                    <h3 style="font-size: 1.1rem; margin: 10px 0 5px;">Total Items: ${order.itemsCount || 1}</h3>
                    <p style="color: var(--muted); font-size: 0.85rem;">Placed on: ${new Date(order.createdAt?.toDate()).toLocaleDateString()}</p>
                    <div class="price" style="margin-top: auto; font-size: 1.2rem; color: var(--green); font-weight: bold;">₹${order.totalPrice || 0}</div>
                </div>`;
            });
        } catch (e) {
            console.error("Order fetch error", e);
        }
    }

    // --- Fetch User Wishlist ---
    async function renderUserWishlist(uid) {
        const container = document.getElementById("realWishlistContainer");
        if (!container) return;

        try {
            const q = query(collection(db, "wishlist"), where("userId", "==", uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                container.innerHTML = `<p style="color: var(--muted); grid-column: 1/-1;">Your wishlist is currently empty.</p>`;
                return;
            }

            container.innerHTML = "";
            querySnapshot.forEach((doc) => {
                const item = doc.data();
                container.innerHTML += `
                <div class="product-card glass-panel">
                    <div class="fav-icon" style="color: var(--green);"><i class="ri-heart-fill"></i></div>
                    <div class="product-img">
                        <img src="${item.image}" alt="${item.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 12px;">
                    </div>
                    <div class="product-details">
                        <div>
                            <h3>${item.name}</h3>
                            <p class="price">₹${item.price}</p>
                        </div>
                        <button class="cart-add-btn"><i class="ri-shopping-cart-2-line"></i></button>
                    </div>
                </div>`;
            });
        } catch (e) {
            console.error("Wishlist fetch error", e);
        }
    }
});