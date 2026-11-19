import { db, resolveStorageUrl, addCacheBust } from "./config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    loadProductsAndFilters();
});

function getResolvedProductImage(product) {
    if (!product) return "";

    const candidates = [
        ...(Array.isArray(product.images) ? product.images : []),
        product.image,
        product.imageUrl,
        product.imageURL,
        product.thumbnail,
        product.thumbnailUrl,
        product.pfp
    ];

    const rawImage = candidates.find(
        (item) => typeof item === "string" && item.trim()
    );

    if (!rawImage) return "";

    const resolved = resolveStorageUrl(rawImage);
    return addCacheBust(resolved);
}

async function loadProductsAndFilters() {
    const container = document.getElementById("productsGrid");

    try {
        const snapshot = await getDocs(collection(db, "products"));
        allProducts = snapshot.docs
            .map((doc) => ({
                id: doc.id,
                ...doc.data()
            }))
            .filter((product) => product.active !== false);

        populateFilters();
        renderProducts(allProducts);
    } catch (error) {
        console.error("Products load karne mein error aayi:", error);
        if (container) {
            container.innerHTML = `<h3 style="grid-column: 1/-1; color: #ff5555;">Products fetch nahi ho paaye. Please try again.</h3>`;
        }
    }
}

function populateFilters() {
    const branchFilter = document.getElementById("branchFilter");
    const categoryFilter = document.getElementById("categoryFilter");

    if (!branchFilter || !categoryFilter) return;

    const branches = [...new Set(allProducts.map((p) => p.branch).filter(Boolean))];
    const categories = [...new Set(allProducts.map((p) => p.category).filter(Boolean))];

    branchFilter.innerHTML =
        `<option value="all">All Branches</option>` +
        branches.map((branch) => `<option value="${branch}">${branch}</option>`).join("");

    categoryFilter.innerHTML =
        `<option value="all">All Categories</option>` +
        categories.map((category) => `<option value="${category}">${category}</option>`).join("");

    branchFilter.addEventListener("change", filterProducts);
    categoryFilter.addEventListener("change", filterProducts);
}

function filterProducts() {
    const selectedBranch = document.getElementById("branchFilter").value;
    const selectedCategory = document.getElementById("categoryFilter").value;

    let filtered = allProducts;

    if (selectedBranch !== "all") {
        filtered = filtered.filter((p) => p.branch === selectedBranch);
    }

    if (selectedCategory !== "all") {
        filtered = filtered.filter((p) => p.category === selectedCategory);
    }

    renderProducts(filtered);
}

function renderProducts(productsToRender) {
    const container = document.getElementById("productsGrid");
    if (!container) return;

    container.innerHTML = "";

    if (productsToRender.length === 0) {
        container.innerHTML = `<h3 style="grid-column: 1/-1; color: var(--muted); text-align: center;">Koi products nahi mile.</h3>`;
        return;
    }

    container.innerHTML = productsToRender
        .map((p) => {
            const name = p.name || p.title || "Untitled Product";
            const image = getResolvedProductImage(p);
            const price = Number(p.price ?? p.salePrice ?? 0).toLocaleString("en-IN");
            const isOutOfStock = p.stock !== undefined && p.stock !== null && Number(p.stock) <= 0;

            const imageHTML = image
                ? `<img src="${image}" alt="${name}" loading="lazy" decoding="async" data-product-image>`
                : `<div class="img-placeholder">JH</div>`;

            return `
            <div class="product-card glass-panel" data-product-id="${p.id}">
                <button type="button" class="fav-icon" data-favorite="${p.id}" aria-label="Add to wishlist">
                    <i class="ri-heart-line"></i>
                </button>

                <a href="product-details.html?id=${encodeURIComponent(p.id)}" class="product-img" aria-label="View ${name}">
                    ${imageHTML}
                </a>

                <div class="product-details">
                    <div class="product-meta">
                        <h3>${name}</h3>
                        <p class="price">₹${price}</p>
                        ${isOutOfStock ? `<small class="stock-out">Out of stock</small>` : ""}
                    </div>

                    <button type="button" class="cart-add-btn" data-add-to-cart="${p.id}" ${isOutOfStock ? "disabled" : ""} aria-label="Add to cart">
                        <i class="ri-shopping-cart-2-line"></i>
                    </button>
                </div>
            </div>
            `;
        })
        .join("");

    // Broken image fallback
    container.querySelectorAll("[data-product-image]").forEach((img) => {
        img.onerror = () => {
            img.onerror = null;
            const placeholder = document.createElement("div");
            placeholder.className = "img-placeholder";
            placeholder.textContent = "JH";
            img.replaceWith(placeholder);
        };
    });

    // Re-bind Add to Cart buttons
    container.querySelectorAll("[data-add-to-cart]").forEach((button) => {
        button.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if (window.addProductToCart) {
                await window.addProductToCart(button.dataset.addToCart);
            }
        };
    });
}