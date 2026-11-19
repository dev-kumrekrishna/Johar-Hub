import { auth, db, resolveStorageUrl, addCacheBust } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import {
    doc,
    getDoc,
    collection,
    getDocs,
    addDoc,
    query,
    where,
    deleteDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const FALLBACK_LOGO = "assets/logos/JH-Logo-V2-White.png";
const POPUP_ICONS = {
    login: "assets/pop-up/login-required.png",
    success: "assets/pop-up/succeed.png",
    error: "assets/pop-up/something-is-wrong.png"
};

let currentUser = null;
let currentProduct = null;
let allProducts = [];
let productReviews = [];
let selectedSize = null;
let quantity = 1;
let wishlistDocId = null;
let selectedRating = 0;
let verifiedOrderId = null;

// Shiprocket Checkout State
let srAddressData = null;
let srCouriers = [];
let srSelectedCourier = null;
let srSelectedPayment = "Cash on Delivery (COD)";

/* =========================================
   UTILITIES & CUSTOM POPUP (ENGLISH ONLY)
========================================= */
function esc(value = "") {
    return String(value).replace(/[&<>'"]/g, (ch) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;"
    }[ch]));
}

function formatINR(num) {
    return `₹${Number(num || 0).toLocaleString("en-IN")}`;
}

function showPopup(title, message, iconType = "success", btnText = "Close", redirectUrl = null) {
    const imageSrc = POPUP_ICONS[iconType] || POPUP_ICONS.success;
    let overlay = document.getElementById("customPopupOverlay");
    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "customPopupOverlay";
        overlay.className = "custom-popup-overlay";
        document.body.appendChild(overlay);
    }

    const actionHTML = redirectUrl
        ? `<a href="${esc(redirectUrl)}" class="custom-popup-btn">${esc(btnText)} <i class="ri-arrow-right-line"></i></a>`
        : `<button type="button" class="custom-popup-btn" id="pdPopupDismissBtn">${esc(btnText)}</button>`;

    overlay.innerHTML = `
        <div class="custom-popup-box">
            <i class="ri-close-line custom-popup-close" id="pdPopupCloseX"></i>
            <img src="${esc(imageSrc)}" alt="Notification" class="custom-popup-img">
            <h3 class="custom-popup-title">${esc(title)}</h3>
            <p class="custom-popup-msg">${esc(message)}</p>
            ${actionHTML}
        </div>
    `;

    const closePopup = () => overlay.classList.remove("active");
    overlay.querySelector("#pdPopupCloseX")?.addEventListener("click", closePopup);
    overlay.querySelector("#pdPopupDismissBtn")?.addEventListener("click", closePopup);
    overlay.onclick = (e) => {
        if (e.target === overlay) closePopup();
    };

    requestAnimationFrame(() => overlay.classList.add("active"));
}

function getAllProductImages(product) {
    if (!product) return [];
    const list = [
        ...(Array.isArray(product.images) ? product.images : []),
        product.image,
        product.imageUrl,
        product.imageURL,
        product.thumbnail,
        product.thumbnailUrl,
        product.pfp
    ]
        .filter((item) => typeof item === "string" && item.trim())
        .map((item) => addCacheBust(resolveStorageUrl(item)));

    return [...new Set(list)];
}

function getPrimaryImage(product) {
    return getAllProductImages(product)[0] || "";
}

/* =========================================
   INITIALIZATION
========================================= */
document.addEventListener("DOMContentLoaded", () => {
    initProductDetailsPage();

    onAuthStateChanged(auth, async (user) => {
        currentUser = user || null;
        if (currentProduct) {
            await Promise.all([checkWishlistStatus(), checkReviewEligibility()]);
        }
    });
});

async function initProductDetailsPage() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("id");

    if (!productId) {
        showErrorState();
        return;
    }

    try {
        const [productSnap, allSnap] = await Promise.all([
            getDoc(doc(db, "products", productId)),
            getDocs(collection(db, "products"))
        ]);

        if (!productSnap.exists() || productSnap.data().active === false) {
            showErrorState();
            return;
        }

        currentProduct = { id: productSnap.id, ...productSnap.data() };
        allProducts = allSnap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((p) => p.active !== false);

        renderProductDetails(currentProduct);
        renderRecommendations(currentProduct, allProducts);
        bindPageInteractions();

        await loadProductReviews(currentProduct.id);
        await Promise.all([checkWishlistStatus(), checkReviewEligibility()]);
    } catch (error) {
        console.error("[JH] Product Details load error:", error);
        showErrorState();
    }
}

function showErrorState() {
    document.getElementById("pdLoader").style.display = "none";
    document.getElementById("pdError").style.display = "flex";
}

/* =========================================
   RENDER ONLY ADMIN-PROVIDED PRODUCT DATA
========================================= */
function renderProductDetails(p) {
    const name = p.name || p.title || "";
    const price = Number(p.price ?? p.salePrice ?? 0);
    const mrp = Number(p.compareAtPrice ?? p.originalPrice ?? p.mrp ?? 0);
    const hasDiscount = mrp > price && price > 0;
    const discountPct = hasDiscount ? Math.round(((mrp - price) / mrp) * 100) : 0;
    const hasStockField = p.stock !== undefined && p.stock !== null && p.stock !== "";
    const stock = hasStockField ? Number(p.stock) : null;
    const isOutOfStock = stock !== null && stock <= 0;

    document.title = name ? `${name} | Johar Horizons` : "Product Details | Johar Horizons";
    document.getElementById("pdBreadcrumbName").textContent = name;
    document.getElementById("pdTitle").textContent = name;

    // Badges — only show fields provided by admin
    let anyBadge = false;
    const branchEl = document.getElementById("pdBranch");
    if (p.branch && String(p.branch).trim()) {
        branchEl.textContent = p.branch;
        branchEl.style.display = "inline-block";
        anyBadge = true;
    }

    const catEl = document.getElementById("pdCategory");
    if (p.category && String(p.category).trim()) {
        catEl.textContent = p.category;
        catEl.style.display = "inline-block";
        anyBadge = true;
    }

    const stockBadge = document.getElementById("pdStockBadge");
    if (hasStockField) {
        stockBadge.style.display = "inline-block";
        anyBadge = true;
        if (isOutOfStock) {
            stockBadge.textContent = "Out of Stock";
            stockBadge.classList.add("out");
        } else {
            stockBadge.textContent = stock <= 5 ? `Only ${stock} Left` : "In Stock";
        }
    }
    if (anyBadge) {
        document.getElementById("pdMetaBadges").style.display = "flex";
    }

    // Price & Discount
    document.getElementById("pdPrice").textContent = formatINR(price);
    if (hasDiscount) {
        document.getElementById("pdMrp").textContent = formatINR(mrp);
        document.getElementById("pdMrp").style.display = "inline";
        document.getElementById("pdOffText").textContent = `${discountPct}% OFF`;
        document.getElementById("pdOffText").style.display = "inline";
        document.getElementById("pdDiscountPill").textContent = `-${discountPct}%`;
        document.getElementById("pdDiscountPill").style.display = "inline-block";
    }

    renderGallery(p, name);
    renderSizes(p);
    updateQuantityUI();

    // Highlights — ONLY if provided by admin in Firestore
    const rawHighlights = Array.isArray(p.highlights)
        ? p.highlights
        : Array.isArray(p.features)
            ? p.features
            : [];
    const cleanHighlights = rawHighlights.map((h) => String(h || "").trim()).filter(Boolean);
    if (cleanHighlights.length) {
        document.getElementById("pdHighlights").innerHTML = cleanHighlights
            .map((h) => `<li>${esc(h)}</li>`)
            .join("");
        document.getElementById("pdHighlightsPanel").style.display = "block";
    }

    // Description — ONLY if provided by admin in Firestore
    const desc = (p.description || p.desc || p.details || "").trim();
    if (desc) {
        document.getElementById("pdDescription").textContent = desc;
        document.getElementById("pdDescPanel").style.display = "block";
    }

    // Specifications — ONLY real fields present in Firestore
    renderSpecifications(p, hasStockField, stock);

    if (isOutOfStock) {
        ["pdAddCartBtn", "pdBuyNowBtn", "pdMobileAddCart", "pdMobileBuyNow"].forEach((id) => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = true;
        });
    }

    document.getElementById("pdLoader").style.display = "none";
    document.getElementById("pdContent").style.display = "grid";
    document.getElementById("pdMobileBar").style.display = "grid";
}

function renderGallery(product, name) {
    const images = getAllProductImages(product);
    const mainImg = document.getElementById("pdMainImg");
    const fallback = document.getElementById("pdImgFallback");
    const thumbsEl = document.getElementById("pdThumbs");

    if (!images.length) {
        mainImg.style.display = "none";
        fallback.style.display = "block";
        thumbsEl.innerHTML = "";
        return;
    }

    const setActiveImage = (src, activeIndex) => {
        mainImg.style.display = "block";
        fallback.style.display = "none";
        mainImg.src = src;
        mainImg.alt = name;
        mainImg.onerror = () => {
            mainImg.style.display = "none";
            fallback.style.display = "block";
        };
        thumbsEl.querySelectorAll(".pd-thumb-btn").forEach((btn, idx) => {
            btn.classList.toggle("active", idx === activeIndex);
        });
    };

    if (images.length > 1) {
        thumbsEl.innerHTML = images
            .map(
                (src, idx) => `
                <button type="button" class="pd-thumb-btn ${idx === 0 ? "active" : ""}" data-idx="${idx}">
                    <img src="${esc(src)}" alt="${esc(name)} view ${idx + 1}" loading="lazy">
                </button>`
            )
            .join("");

        thumbsEl.querySelectorAll(".pd-thumb-btn").forEach((btn) => {
            btn.addEventListener("click", () => {
                const idx = Number(btn.dataset.idx);
                setActiveImage(images[idx], idx);
            });
        });
    } else {
        thumbsEl.innerHTML = "";
    }

    setActiveImage(images[0], 0);
}

function renderSizes(product) {
    const sizeBlock = document.getElementById("pdSizeBlock");
    const sizeList = document.getElementById("pdSizeList");
    const sizeLabel = document.getElementById("pdSelectedSizeText");

    let sizes = [];
    if (Array.isArray(product.sizes)) {
        sizes = product.sizes.map((s) => String(s || "").trim()).filter(Boolean);
    } else if (typeof product.sizes === "string" && product.sizes.trim()) {
        sizes = product.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    }

    if (!sizes.length) {
        sizeBlock.style.display = "none";
        selectedSize = null;
        return;
    }

    selectedSize = sizes[0];
    sizeLabel.textContent = `Selected: ${selectedSize}`;
    sizeBlock.style.display = "flex";

    sizeList.innerHTML = sizes
        .map(
            (sz, idx) => `
            <button type="button" class="pd-size-chip ${idx === 0 ? "active" : ""}" data-size="${esc(sz)}">
                ${esc(sz)}
            </button>`
        )
        .join("");

    sizeList.querySelectorAll(".pd-size-chip").forEach((btn) => {
        btn.addEventListener("click", () => {
            selectedSize = btn.dataset.size;
            sizeLabel.textContent = `Selected: ${selectedSize}`;
            sizeList.querySelectorAll(".pd-size-chip").forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
        });
    });
}

function renderSpecifications(p, hasStockField, stock) {
    const panel = document.getElementById("pdSpecsPanel");
    const table = document.getElementById("pdSpecsTable");
    const rows = [];

    const knownFields = [
        ["Brand", p.brand],
        ["Branch", p.branch],
        ["Category", p.category],
        ["SKU", p.sku],
        ["Material", p.material],
        ["Fabric", p.fabric],
        ["Color", p.color],
        ["Fit", p.fit],
        ["Weight", p.weight],
        ["Dimensions", p.dimensions],
        ["Warranty", p.warranty]
    ];

    knownFields.forEach(([label, val]) => {
        if (val !== undefined && val !== null && String(val).trim() !== "") {
            rows.push([label, String(val).trim()]);
        }
    });

    if (hasStockField) {
        rows.push(["Stock", stock <= 0 ? "Out of Stock" : `${stock} units available`]);
    }

    const customSpecs = p.specifications || p.specs;
    if (customSpecs && typeof customSpecs === "object" && !Array.isArray(customSpecs)) {
        Object.entries(customSpecs).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).trim() !== "") {
                rows.push([k, String(v).trim()]);
            }
        });
    } else if (Array.isArray(customSpecs)) {
        customSpecs.forEach((entry) => {
            const label = entry?.label || entry?.key;
            if (label && entry?.value !== undefined && String(entry.value).trim() !== "") {
                rows.push([label, String(entry.value).trim()]);
            }
        });
    }

    if (!rows.length) {
        panel.style.display = "none";
        return;
    }

    table.innerHTML = rows
        .map(
            ([key, val]) => `
            <div class="pd-spec-row">
                <div class="pd-spec-key">${esc(key)}</div>
                <div class="pd-spec-val">${esc(val)}</div>
            </div>`
        )
        .join("");

    panel.style.display = "block";
}

function updateQuantityUI() {
    const price = Number(currentProduct?.price ?? currentProduct?.salePrice ?? 0);
    document.getElementById("pdQtyValue").textContent = quantity;
    document.getElementById("pdQtySubtotal").textContent = `Total: ${formatINR(price * quantity)}`;
}

/* =========================================
   REAL DATABASE RATINGS & VERIFIED REVIEWS
========================================= */
async function loadProductReviews(productId) {
    try {
        const q = query(collection(db, "reviews"), where("productId", "==", productId));
        const snap = await getDocs(q);

        productReviews = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((r) => Number(r.rating) >= 1 && Number(r.rating) <= 5)
            .sort((a, b) => {
                const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Number(a.createdAt || 0);
                const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Number(b.createdAt || 0);
                return tB - tA;
            });

        renderReviewsUI();
    } catch (error) {
        console.error("[JH] Failed to load reviews:", error);
    }
}

function renderReviewsUI() {
    const count = productReviews.length;
    const pillEl = document.getElementById("pdRatingPill");
    const countEl = document.getElementById("pdRatingCount");
    const bigAvgEl = document.getElementById("pdReviewBigAvg");
    const starsDisplayEl = document.getElementById("pdReviewStarsDisplay");
    const totalTextEl = document.getElementById("pdReviewTotalText");
    const barsEl = document.getElementById("pdRatingBars");
    const listEl = document.getElementById("pdReviewsList");

    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;

    productReviews.forEach((r) => {
        const val = Math.round(Number(r.rating));
        if (breakdown[val] !== undefined) breakdown[val]++;
        sum += Number(r.rating);
    });

    if (count > 0) {
        const avg = (sum / count).toFixed(1);
        pillEl.innerHTML = `${avg} <i class="ri-star-fill"></i>`;
        pillEl.style.display = "inline-flex";
        countEl.textContent = `${count} verified ${count === 1 ? "rating" : "ratings"}`;

        bigAvgEl.textContent = avg;
        const fullStars = Math.round(Number(avg));
        starsDisplayEl.innerHTML = Array.from({ length: 5 }, (_, i) =>
            i < fullStars ? `<i class="ri-star-fill"></i>` : `<i class="ri-star-line"></i>`
        ).join("");
        totalTextEl.textContent = `${count} verified ${count === 1 ? "review" : "reviews"}`;
    } else {
        pillEl.style.display = "none";
        countEl.textContent = "No ratings yet";
        bigAvgEl.textContent = "—";
        starsDisplayEl.innerHTML = Array.from({ length: 5 }, () => `<i class="ri-star-line"></i>`).join("");
        totalTextEl.textContent = "0 verified ratings";
    }

    // 5-to-1 breakdown bars
    barsEl.innerHTML = [5, 4, 3, 2, 1]
        .map((star) => {
            const pct = count > 0 ? Math.round((breakdown[star] / count) * 100) : 0;
            return `
            <div class="pd-bar-row">
                <span>${star}★</span>
                <div class="pd-bar-track"><div class="pd-bar-fill" style="width: ${pct}%;"></div></div>
                <span>${breakdown[star]}</span>
            </div>`;
        })
        .join("");

    // Reviews List
    if (!count) {
        listEl.innerHTML = `<p class="pd-no-reviews">No reviews yet. Ratings and reviews are unlocked for customers after order delivery.</p>`;
        return;
    }

    listEl.innerHTML = productReviews
        .map((r) => {
            const dateObj = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt || Date.now());
            const dateStr = dateObj.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
            return `
            <article class="pd-review-item">
                <div class="pd-review-item-top">
                    <div class="pd-review-author">
                        <span class="pd-review-pill">${Number(r.rating).toFixed(0)} <i class="ri-star-fill"></i></span>
                        <span>${esc(r.userName || "Verified Buyer")}</span>
                        <span class="pd-review-verified-tag"><i class="ri-checkbox-circle-fill"></i> Verified Purchase</span>
                    </div>
                    <span class="pd-review-date">${esc(dateStr)}</span>
                </div>
                ${r.title ? `<h5 class="pd-review-title">${esc(r.title)}</h5>` : ""}
                <p class="pd-review-body">${esc(r.comment || "")}</p>
            </article>`;
        })
        .join("");
}

async function checkReviewEligibility() {
    const box = document.getElementById("pdReviewEligibilityBox");
    const form = document.getElementById("pdReviewForm");
    if (!box || !form || !currentProduct) return;

    verifiedOrderId = null;

    if (!currentUser) {
        form.style.display = "none";
        box.style.display = "block";
        box.innerHTML = `<i class="ri-lock-line"></i> <a href="auth.html">Sign in</a> to write a review once your order has been delivered.`;
        return;
    }

    const alreadyReviewed = productReviews.some((r) => r.userId === currentUser.uid);
    if (alreadyReviewed) {
        form.style.display = "none";
        box.style.display = "block";
        box.innerHTML = `<i class="ri-checkbox-circle-line" style="color: var(--green);"></i> Thank you! You have already submitted a verified review for this product.`;
        return;
    }

    try {
        const ordersSnap = await getDocs(
            query(collection(db, "orders"), where("userId", "==", currentUser.uid))
        );

        let deliveredMatch = null;
        ordersSnap.forEach((docSnap) => {
            const order = docSnap.data();
            const status = String(order.status || "").trim().toUpperCase();
            const isDelivered = status === "DELIVERED" || status === "COMPLETED";
            if (!isDelivered) return;

            const hasProduct =
                order.productId === currentProduct.id ||
                (Array.isArray(order.items) &&
                    order.items.some((it) => it.productId === currentProduct.id || it.id === currentProduct.id));

            if (hasProduct) {
                deliveredMatch = docSnap.id;
            }
        });

        if (deliveredMatch) {
            verifiedOrderId = deliveredMatch;
            box.style.display = "none";
            form.style.display = "flex";
        } else {
            form.style.display = "none";
            box.style.display = "block";
            box.innerHTML = `<i class="ri-truck-line"></i> Only customers whose order for this product has been marked <strong>Delivered</strong> can submit a rating and review.`;
        }
    } catch (error) {
        console.warn("[JH] Review eligibility check failed:", error);
        form.style.display = "none";
        box.style.display = "block";
        box.textContent = "Ratings are available only for verified buyers after delivery.";
    }
}

async function handleReviewSubmit(event) {
    event.preventDefault();
    if (!currentUser || !currentProduct || !verifiedOrderId) {
        showPopup(
            "Review Restricted",
            "Only verified buyers who have received this product can submit a review.",
            "error",
            "Got It"
        );
        return;
    }

    if (selectedRating < 1 || selectedRating > 5) {
        showPopup("Select a Rating", "Please choose a star rating from 1 to 5 before submitting.", "error", "OK");
        return;
    }

    const title = document.getElementById("pdReviewTitle").value.trim();
    const comment = document.getElementById("pdReviewComment").value.trim();
    if (!comment) {
        showPopup("Review Required", "Please write a short review about your product experience.", "error", "OK");
        return;
    }

    const submitBtn = document.getElementById("pdSubmitReviewBtn");
    const originalHTML = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `Submitting... <i class="ri-loader-4-line ri-spin"></i>`;

    try {
        let reviewerName = currentUser.displayName || "Verified Buyer";
        try {
            const uSnap = await getDoc(doc(db, "users", currentUser.uid));
            if (uSnap.exists() && uSnap.data().name) {
                reviewerName = uSnap.data().name;
            }
        } catch {}

        await addDoc(collection(db, "reviews"), {
            productId: currentProduct.id,
            userId: currentUser.uid,
            userName: reviewerName,
            orderId: verifiedOrderId,
            rating: selectedRating,
            title,
            comment,
            verifiedPurchase: true,
            createdAt: serverTimestamp()
        });

        document.getElementById("pdReviewForm").reset();
        selectedRating = 0;
        await loadProductReviews(currentProduct.id);
        await checkReviewEligibility();

        showPopup(
            "Review Submitted",
            "Thank you for sharing your verified feedback. Your rating is now live.",
            "success",
            "Awesome"
        );
    } catch (error) {
        console.error("[JH] Review submit failed:", error);
        showPopup(
            "Submission Failed",
            "We could not save your review right now. Please try again shortly.",
            "error",
            "Try Again"
        );
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
    }
}

/* =========================================
   SIMILAR & YOU MIGHT ALSO LIKE
========================================= */
function renderRecommendations(current, products) {
    const others = products.filter((p) => p.id !== current.id);
    if (!others.length) return;

    const sameCategory = others.filter(
        (p) => current.category && p.category && p.category.toLowerCase() === current.category.toLowerCase()
    );
    const sameBranch = others.filter(
        (p) =>
            !sameCategory.some((sc) => sc.id === p.id) &&
            current.branch &&
            p.branch &&
            p.branch.toLowerCase() === current.branch.toLowerCase()
    );
    const similar = [...sameCategory, ...sameBranch].slice(0, 4);

    if (similar.length) {
        document.getElementById("similarSection").style.display = "block";
        renderRecoGrid("similarProductsGrid", similar);
    }

    const similarIds = new Set(similar.map((p) => p.id));
    let alsoLike = others.filter((p) => !similarIds.has(p.id));
    if (alsoLike.length < 4) {
        alsoLike = [...alsoLike, ...similar.filter((p) => !alsoLike.some((a) => a.id === p.id))];
    }
    alsoLike = alsoLike.sort(() => 0.5 - Math.random()).slice(0, 4);

    if (alsoLike.length) {
        document.getElementById("alsoLikeSection").style.display = "block";
        renderRecoGrid("alsoLikeGrid", alsoLike);
    }
}

function renderRecoGrid(containerId, items) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = items
        .map((p) => {
            const name = p.name || p.title || "";
            const img = getPrimaryImage(p);
            const price = formatINR(p.price ?? p.salePrice ?? 0);
            const outOfStock = p.stock !== undefined && p.stock !== null && Number(p.stock) <= 0;

            return `
            <div class="product-card glass-panel" data-product-id="${esc(p.id)}">
                <a href="product-details.html?id=${encodeURIComponent(p.id)}" class="product-img" aria-label="View ${esc(name)}">
                    ${
                        img
                            ? `<img src="${esc(img)}" alt="${esc(name)}" loading="lazy" data-reco-img>`
                            : `<div class="img-placeholder">JH</div>`
                    }
                </a>
                <div class="product-details">
                    <div class="product-meta">
                        <h3>${esc(name)}</h3>
                        <p class="price">${price}</p>
                    </div>
                    <button type="button" class="cart-add-btn" data-add-to-cart="${esc(p.id)}" ${outOfStock ? "disabled" : ""} aria-label="Add to cart">
                        <i class="ri-shopping-cart-2-line"></i>
                    </button>
                </div>
            </div>`;
        })
        .join("");

    container.querySelectorAll("[data-reco-img]").forEach((img) => {
        img.onerror = () => {
            img.onerror = null;
            const ph = document.createElement("div");
            ph.className = "img-placeholder";
            ph.textContent = "JH";
            img.replaceWith(ph);
        };
    });

    container.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.addProductToCart) {
                await window.addProductToCart(btn.dataset.addToCart);
            }
        });
    });
}

/* =========================================
   PAGE INTERACTIONS & WISHLIST
========================================= */
function bindPageInteractions() {
    document.getElementById("pdQtyMinus")?.addEventListener("click", () => {
        if (quantity > 1) {
            quantity--;
            updateQuantityUI();
        }
    });

    document.getElementById("pdQtyPlus")?.addEventListener("click", () => {
        const maxStock =
            currentProduct?.stock !== undefined && currentProduct?.stock !== null
                ? Math.min(Number(currentProduct.stock), 10)
                : 10;
        if (quantity < maxStock) {
            quantity++;
            updateQuantityUI();
        }
    });

    const handleAddCart = async () => {
        if (!currentProduct) return;
        if (window.addProductToCart) {
            await window.addProductToCart(currentProduct.id);
        }
    };
    document.getElementById("pdAddCartBtn")?.addEventListener("click", handleAddCart);
    document.getElementById("pdMobileAddCart")?.addEventListener("click", handleAddCart);

    const handleBuyNow = () => openShiprocketCheckout();
    document.getElementById("pdBuyNowBtn")?.addEventListener("click", handleBuyNow);
    document.getElementById("pdMobileBuyNow")?.addEventListener("click", handleBuyNow);

    document.getElementById("pdWishlistBtn")?.addEventListener("click", toggleDetailWishlist);

    document.getElementById("pdShareBtn")?.addEventListener("click", async () => {
        try {
            if (navigator.share) {
                await navigator.share({
                    title: currentProduct?.name || "Johar Horizons",
                    text: `Check out ${currentProduct?.name || "this product"} on Johar Horizons`,
                    url: window.location.href
                });
            } else {
                await navigator.clipboard.writeText(window.location.href);
                showPopup("Link Copied", "Product link has been copied to your clipboard.", "success", "Done");
            }
        } catch {}
    });

    // Star Picker for Verified Reviews
    const starLabels = ["", "Poor", "Fair", "Good", "Very Good", "Excellent"];
    const starButtons = document.querySelectorAll("#pdStarPicker button");
    starButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            selectedRating = Number(btn.dataset.star);
            document.getElementById("pdSelectedRatingLabel").textContent = `${selectedRating}/5 — ${starLabels[selectedRating]}`;
            starButtons.forEach((b) => {
                const isFilled = Number(b.dataset.star) <= selectedRating;
                b.classList.toggle("active", isFilled);
                b.innerHTML = isFilled ? `<i class="ri-star-fill"></i>` : `<i class="ri-star-line"></i>`;
            });
        });
    });

    document.getElementById("pdReviewForm")?.addEventListener("submit", handleReviewSubmit);

    // Shiprocket Checkout Events
    bindShiprocketModalEvents();
}

async function checkWishlistStatus() {
    const btn = document.getElementById("pdWishlistBtn");
    if (!currentUser || !currentProduct || !btn) return;

    try {
        const snap = await getDocs(
            query(
                collection(db, "wishlist"),
                where("userId", "==", currentUser.uid),
                where("productId", "==", currentProduct.id)
            )
        );
        if (!snap.empty) {
            wishlistDocId = snap.docs[0].id;
            btn.classList.add("active");
            btn.innerHTML = `<i class="ri-heart-fill"></i>`;
        } else {
            wishlistDocId = null;
            btn.classList.remove("active");
            btn.innerHTML = `<i class="ri-heart-line"></i>`;
        }
    } catch {}
}

async function toggleDetailWishlist() {
    if (!currentUser) {
        showPopup(
            "Login Required",
            "Please sign in to save this product to your wishlist.",
            "login",
            "Login / Sign Up",
            "auth.html"
        );
        return;
    }

    const btn = document.getElementById("pdWishlistBtn");
    try {
        if (wishlistDocId) {
            await deleteDoc(doc(db, "wishlist", wishlistDocId));
            wishlistDocId = null;
            btn.classList.remove("active");
            btn.innerHTML = `<i class="ri-heart-line"></i>`;
            showPopup("Removed from Wishlist", "This product has been removed from your wishlist.", "success", "OK");
        } else {
            const added = await addDoc(collection(db, "wishlist"), {
                userId: currentUser.uid,
                productId: currentProduct.id,
                name: currentProduct.name || currentProduct.title || "Product",
                price: Number(currentProduct.price ?? currentProduct.salePrice ?? 0),
                image: currentProduct.image || currentProduct.images?.[0] || "",
                createdAt: serverTimestamp()
            });
            wishlistDocId = added.id;
            btn.classList.add("active");
            btn.innerHTML = `<i class="ri-heart-fill"></i>`;
            showPopup("Saved to Wishlist", "This product has been added to your wishlist.", "success", "Great");
        }
    } catch (error) {
        console.error("[JH] Wishlist error:", error);
        showPopup("Action Failed", "Unable to update your wishlist. Please try again.", "error", "OK");
    }
}

/* =========================================
   SHIPROCKET-THEMED DUMMY ORDER WORKFLOW
========================================= */
function setShiprocketStep(stepName) {
    const panels = {
        1: "srStep1Form",
        2: "srStep2Panel",
        3: "srStep3Panel",
        processing: "srProcessingPanel",
        success: "srSuccessPanel"
    };

    Object.values(panels).forEach((id) => {
        document.getElementById(id)?.classList.remove("active");
    });
    document.getElementById(panels[stepName])?.classList.add("active");

    const stepper = document.getElementById("srStepper");
    const strip = document.getElementById("srItemStrip");
    const showChrome = stepName === 1 || stepName === 2 || stepName === 3;
    stepper.style.display = showChrome ? "flex" : "none";
    strip.style.display = showChrome ? "flex" : "none";

    if (showChrome) {
        stepper.querySelectorAll(".sr-step").forEach((el) => {
            const n = Number(el.dataset.step);
            el.classList.toggle("active", n === stepName);
            el.classList.toggle("done", n < stepName);
        });
    }
}

async function openShiprocketCheckout() {
    if (!currentUser) {
        showPopup(
            "Login Required",
            "Please sign in or create an account to place an order with Shiprocket Checkout.",
            "login",
            "Login / Sign Up",
            "auth.html"
        );
        return;
    }

    const price = Number(currentProduct.price ?? currentProduct.salePrice ?? 0);
    const subtotal = price * quantity;
    const img = getPrimaryImage(currentProduct) || FALLBACK_LOGO;

    document.getElementById("srSummaryImg").src = img;
    document.getElementById("srSummaryName").textContent = currentProduct.name || currentProduct.title;
    document.getElementById("srSummaryMeta").textContent =
        `${selectedSize ? `Size: ${selectedSize} • ` : ""}Qty: ${quantity}`;
    document.getElementById("srSummaryTotal").textContent = formatINR(subtotal);

    // Pre-fill saved profile details if available
    try {
        const userSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (userSnap.exists()) {
            const data = userSnap.data();
            const fName = document.getElementById("srFullName");
            const fPhone = document.getElementById("srPhone");
            const fAddr = document.getElementById("srAddress");
            if (fName && !fName.value) fName.value = data.name || "";
            if (fPhone && !fPhone.value) fPhone.value = data.phone || "";
            if (fAddr && !fAddr.value) fAddr.value = data.address || "";
        }
    } catch {}

    setShiprocketStep(1);
    document.getElementById("srModalOverlay").classList.add("active");
    document.body.style.overflow = "hidden";
}

function closeShiprocketCheckout() {
    document.getElementById("srModalOverlay").classList.remove("active");
    document.body.style.overflow = "";
}

function buildCourierOptions(pincode) {
    const getEta = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    };

    srCouriers = [
        {
            id: "delhivery",
            name: "Delhivery Surface",
            rating: "4.6★ Shiprocket Partner",
            eta: getEta(5),
            fee: 0
        },
        {
            id: "xpressbees",
            name: "Xpressbees Standard",
            rating: "4.5★ Shiprocket Partner",
            eta: getEta(4),
            fee: 0
        },
        {
            id: "bluedart",
            name: "Blue Dart Air Express",
            rating: "4.8★ Priority Air",
            eta: getEta(2),
            fee: 49
        }
    ];
    srSelectedCourier = srCouriers[0];

    document.getElementById("srPinDisplay").textContent = pincode;
    const list = document.getElementById("srCourierList");
    list.innerHTML = srCouriers
        .map(
            (c, idx) => `
            <label class="sr-courier-card ${idx === 0 ? "active" : ""}" data-courier-id="${c.id}">
                <input type="radio" name="srCourier" value="${c.id}" ${idx === 0 ? "checked" : ""}>
                <div class="sr-courier-meta">
                    <strong>${esc(c.name)}</strong>
                    <small>Est. delivery by ${esc(c.eta)} • ${esc(c.rating)}</small>
                </div>
                <span class="sr-courier-price">${c.fee === 0 ? "FREE" : formatINR(c.fee)}</span>
            </label>`
        )
        .join("");

    list.querySelectorAll(".sr-courier-card").forEach((card) => {
        card.addEventListener("click", () => {
            const id = card.dataset.courierId;
            srSelectedCourier = srCouriers.find((c) => c.id === id) || srCouriers[0];
            list.querySelectorAll(".sr-courier-card").forEach((el) => el.classList.remove("active"));
            card.classList.add("active");
            updateShiprocketBill();
        });
    });

    updateShiprocketBill();
}

function updateShiprocketBill() {
    const unitPrice = Number(currentProduct?.price ?? currentProduct?.salePrice ?? 0);
    const subtotal = unitPrice * quantity;
    const shipping = srSelectedCourier ? srSelectedCourier.fee : 0;
    const grandTotal = subtotal + shipping;

    document.getElementById("srSummaryTotal").textContent = formatINR(grandTotal);
    document.getElementById("srBillQty").textContent = quantity;
    document.getElementById("srBillSubtotal").textContent = formatINR(subtotal);
    document.getElementById("srBillCourier").textContent = srSelectedCourier?.name || "Standard";
    document.getElementById("srBillShipping").textContent = shipping === 0 ? "FREE" : formatINR(shipping);
    document.getElementById("srBillTotal").textContent = formatINR(grandTotal);
}

function bindShiprocketModalEvents() {
    const overlay = document.getElementById("srModalOverlay");
    document.getElementById("srCloseModal")?.addEventListener("click", closeShiprocketCheckout);
    document.getElementById("srContinueShopping")?.addEventListener("click", closeShiprocketCheckout);
    overlay?.addEventListener("click", (e) => {
        if (e.target === overlay) closeShiprocketCheckout();
    });

    // Step 1 -> Step 2
    document.getElementById("srStep1Form")?.addEventListener("submit", (e) => {
        e.preventDefault();
        const phone = document.getElementById("srPhone").value.trim();
        const pincode = document.getElementById("srPincode").value.trim();

        if (!/^[0-9+\s-]{10,15}$/.test(phone)) {
            showPopup("Invalid Mobile Number", "Please enter a valid 10-digit mobile number.", "error", "Fix Now");
            return;
        }
        if (!/^[1-9][0-9]{5}$/.test(pincode)) {
            showPopup("Invalid Pincode", "Please enter a valid 6-digit Indian delivery pincode.", "error", "Fix Now");
            return;
        }

        srAddressData = {
            fullName: document.getElementById("srFullName").value.trim(),
            phone,
            address: document.getElementById("srAddress").value.trim(),
            city: document.getElementById("srCity").value.trim(),
            state: document.getElementById("srState").value.trim(),
            pincode
        };

        buildCourierOptions(pincode);
        setShiprocketStep(2);
    });

    document.getElementById("srBackToStep1")?.addEventListener("click", () => setShiprocketStep(1));
    document.getElementById("srGoToStep3")?.addEventListener("click", () => {
        updateShiprocketBill();
        setShiprocketStep(3);
    });
    document.getElementById("srBackToStep2")?.addEventListener("click", () => setShiprocketStep(2));

    // Payment Radio Selection
    document.querySelectorAll("#srPaymentList .sr-pay-option").forEach((option) => {
        option.addEventListener("click", () => {
            const radio = option.querySelector("input[type='radio']");
            if (radio) {
                radio.checked = true;
                srSelectedPayment = radio.value;
            }
            document.querySelectorAll("#srPaymentList .sr-pay-option").forEach((el) => el.classList.remove("active"));
            option.classList.add("active");
        });
    });

    // Final Confirm & Simulated Shiprocket Processing
    document.getElementById("srPlaceOrderBtn")?.addEventListener("click", processShiprocketOrder);
}

async function processShiprocketOrder() {
    if (!currentUser || !currentProduct || !srAddressData || !srSelectedCourier) return;

    setShiprocketStep("processing");
    const procTitle = document.getElementById("srProcessTitle");
    const procDesc = document.getElementById("srProcessDesc");

    const wait = (ms) => new Promise((res) => setTimeout(res, ms));

    try {
        procTitle.textContent = "Connecting to Shiprocket Gateway...";
        procDesc.textContent = `Validating ${srSelectedPayment} and confirming serviceability for ${srAddressData.pincode}.`;
        await wait(900);

        procTitle.textContent = "Generating AWB & Shipment Label...";
        procDesc.textContent = `Assigning ${srSelectedCourier.name} via Shiprocket Logistics.`;
        await wait(900);

        const unitPrice = Number(currentProduct.price ?? currentProduct.salePrice ?? 0);
        const shippingFee = srSelectedCourier.fee;
        const totalPrice = unitPrice * quantity + shippingFee;
        const awbCode = `SRJH${Math.floor(10000000 + Math.random() * 90000000)}`;

        const orderPayload = {
            userId: currentUser.uid,
            userEmail: currentUser.email || "",
            status: "PROCESSING",
            shipmentProvider: "Shiprocket (Demo)",
            shipmentStatus: "AWB_GENERATED",
            awbCode,
            courierName: srSelectedCourier.name,
            estimatedDelivery: srSelectedCourier.eta,
            shippingFee,
            itemsCount: quantity,
            totalPrice,
            paymentMethod: srSelectedPayment,
            shippingDetails: srAddressData,
            items: [
                {
                    productId: currentProduct.id,
                    name: currentProduct.name || currentProduct.title || "Product",
                    price: unitPrice,
                    quantity,
                    size: selectedSize || null,
                    image: currentProduct.image || currentProduct.images?.[0] || ""
                }
            ],
            createdAt: serverTimestamp()
        };

        const orderRef = await addDoc(collection(db, "orders"), orderPayload);

        document.getElementById("srConfirmOrderId").textContent = `#${orderRef.id.substring(0, 8).toUpperCase()}`;
        document.getElementById("srConfirmAwb").textContent = awbCode;
        document.getElementById("srConfirmCourier").textContent = srSelectedCourier.name;
        document.getElementById("srConfirmEta").textContent = srSelectedCourier.eta;

        setShiprocketStep("success");
    } catch (error) {
        console.error("[JH] Shiprocket order error:", error);
        closeShiprocketCheckout();
        showPopup(
            "Order Failed",
            "We could not complete your Shiprocket checkout right now. Please try again.",
            "error",
            "Try Again"
        );
    }
}