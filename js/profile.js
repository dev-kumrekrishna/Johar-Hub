import { auth, db, uploadPfp, resolveStorageUrl, addCacheBust } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc, updateDoc, collection, getDocs, query, where, deleteDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const FALLBACK_PFP = email => `https://ui-avatars.com/api/?name=${encodeURIComponent(email || "Johar User")}&background=08fb8f&color=000`;
const FALLBACK_PRODUCT = "assets/logos/JH-Logo-White.png";

function imageUrl(value) {
    return addCacheBust(resolveStorageUrl(value));
}

function setPfp(url, email) {
    const finalUrl = imageUrl(url) || FALLBACK_PFP(email);
    ["mainProfilePic", "desktopPfp", "mobilePfp"].forEach(id => {
        const img = document.getElementById(id);
        if (!img) return;
        img.src = finalUrl;
        img.onerror = () => {
            img.onerror = null;
            img.src = FALLBACK_PFP(email);
        };
    });
}

function esc(value = "") {
    return String(value).replace(/[&<>'"]/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
    }[c]));
}

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, async user => {
        if (!user) {
            location.href = "auth.html";
            return;
        }

        const userRef = doc(db, "users", user.uid);

        try {
            const userDoc = await getDoc(userRef);
            const data = userDoc.exists() ? userDoc.data() : {};

            const name = data.name || "Johar User";
            document.getElementById("mainProfileName")?.replaceChildren(document.createTextNode(name));
            document.getElementById("mainProfileEmail")?.replaceChildren(document.createTextNode(user.email || ""));
            const nameInput = document.getElementById("profileNameInput");
            const phoneInput = document.getElementById("profilePhoneInput");
            const addressInput = document.getElementById("profileAddressInput");
            if (nameInput) nameInput.value = name;
            if (phoneInput) phoneInput.value = data.phone || "";
            if (addressInput) addressInput.value = data.address || "";

            setPfp(data.pfp, user.email);
            await Promise.all([renderUserOrders(user.uid), renderUserWishlist(user.uid)]);
        } catch (error) {
            console.error("Profile load error:", error);
        }

        const pfpUpload = document.getElementById("pfpUpload");
        if (pfpUpload && !pfpUpload.dataset.bound) {
            pfpUpload.dataset.bound = "1";
            pfpUpload.addEventListener("change", async event => {
                const file = event.target.files?.[0];
                if (!file) return;

                const label = document.getElementById("uploadLabel");
                if (label) label.innerHTML = '<i class="ri-loader-4-line ri-spin"></i>';

                try {
                    const r2Url = await uploadPfp(user.uid, file);
                    if (!r2Url) throw new Error("R2 upload failed");
                    await updateDoc(userRef, { pfp: r2Url });
                    setPfp(r2Url, user.email);
                    alert("Profile picture updated successfully!");
                } catch (error) {
                    console.error("PFP upload error:", error);
                    alert("Profile picture upload failed. Check the Worker URL/R2 binding.");
                } finally {
                    if (label) label.innerHTML = '<i class="ri-pencil-line"></i>';
                    pfpUpload.value = "";
                }
            });
        }

        const profileForm = document.getElementById("updateProfileForm");
        if (profileForm && !profileForm.dataset.bound) {
            profileForm.dataset.bound = "1";
            profileForm.addEventListener("submit", async event => {
                event.preventDefault();
                const button = document.getElementById("updateBtn");
                const original = button?.innerHTML || "Save Details";
                if (button) button.innerHTML = `Saving... <i class="ri-loader-4-line ri-spin"></i>`;

                const phone = document.getElementById("profilePhoneInput")?.value.trim() || "";
                const address = document.getElementById("profileAddressInput")?.value.trim() || "";

                try {
                    await updateDoc(userRef, { phone, address });
                    alert("Profile Updated Successfully!");
                } catch (error) {
                    console.error("Profile update error:", error);
                    alert("Error updating profile.");
                } finally {
                    if (button) button.innerHTML = original;
                }
            });
        }
    });

    document.getElementById("logoutBtnProfile")?.addEventListener("click", async event => {
        event.preventDefault();
        await signOut(auth);
        location.href = "index.html";
    });
});

async function renderUserOrders(uid) {
    const container = document.getElementById("realOrdersContainer");
    if (!container) return;

    try {
        const snapshot = await getDocs(query(collection(db, "orders"), where("userId", "==", uid)));
        if (snapshot.empty) {
            container.innerHTML = `<p style="color:var(--muted);grid-column:1/-1">You haven't placed any orders yet.</p>`;
            return;
        }

        container.innerHTML = "";
        snapshot.forEach(orderDoc => {
            const order = orderDoc.data();
            const created = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt || Date.now());
            container.insertAdjacentHTML("beforeend", `
                <div class="product-card glass-panel order-custom-card">
                    <div class="order-custom-header">
                        <span class="order-id-txt">#${esc(orderDoc.id.substring(0, 8).toUpperCase())}</span>
                        <span class="status available">${esc(order.status || "PROCESSING")}</span>
                    </div>
                    <h3 style="font-size:1.1rem;margin:10px 0 5px">Total Items: ${Number(order.itemsCount || 1)}</h3>
                    <p style="color:var(--muted);font-size:.85rem">Placed on: ${created.toLocaleDateString("en-IN")}</p>
                    <div class="price" style="margin-top:auto;font-size:1.2rem;color:var(--green);font-weight:bold">₹${Number(order.totalPrice || 0).toLocaleString("en-IN")}</div>
                </div>`);
        });
    } catch (error) {
        console.error("Order fetch error:", error);
        container.innerHTML = `<p style="color:var(--muted);grid-column:1/-1">Could not load your orders.</p>`;
    }
}

async function renderUserWishlist(uid) {
    const container = document.getElementById("realWishlistContainer");
    if (!container) return;

    try {
        const snapshot = await getDocs(query(collection(db, "wishlist"), where("userId", "==", uid)));
        if (snapshot.empty) {
            container.innerHTML = `<p style="color:var(--muted);grid-column:1/-1">Your wishlist is currently empty.</p>`;
            return;
        }

        container.innerHTML = "";
        snapshot.forEach(itemDoc => {
            const item = itemDoc.data();
            const image = imageUrl(item.image) || FALLBACK_PRODUCT;
            container.insertAdjacentHTML("beforeend", `
                <article class="product-card glass-panel">
                    <button type="button" class="fav-icon profile-remove-wishlist" data-wishlist-id="${esc(itemDoc.id)}" aria-label="Remove from wishlist">
                        <i class="ri-heart-fill"></i>
                    </button>
                    <a class="product-img" href="product.html?id=${encodeURIComponent(item.productId || "")}">
                        <img src="${esc(image)}" alt="${esc(item.name || "Product")}" style="width:100%;height:100%;object-fit:cover;border-radius:12px" onerror="this.onerror=null;this.src='${FALLBACK_PRODUCT}'">
                    </a>
                    <div class="product-details">
                        <div>
                            <h3>${esc(item.name || "Product")}</h3>
                            <p class="price">₹${Number(item.price || 0).toLocaleString("en-IN")}</p>
                        </div>
                        <button type="button" class="cart-add-btn profile-cart-add" data-product-id="${esc(item.productId || "")}">
                            <i class="ri-shopping-cart-2-line"></i>
                        </button>
                    </div>
                </article>`);
        });

        container.querySelectorAll(".profile-remove-wishlist").forEach(button => {
            button.onclick = async () => {
                try {
                    await deleteDoc(doc(db, "wishlist", button.dataset.wishlistId));
                    await renderUserWishlist(uid);
                } catch (error) {
                    console.error("Wishlist removal error:", error);
                }
            };
        });

        container.querySelectorAll(".profile-cart-add").forEach(button => {
            button.onclick = async () => {
                if (!button.dataset.productId) return;
                await window.addProductToCart?.(button.dataset.productId);
            };
        });
    } catch (error) {
        console.error("Wishlist fetch error:", error);
        container.innerHTML = `<p style="color:var(--muted);grid-column:1/-1">Could not load your wishlist.</p>`;
    }
}
