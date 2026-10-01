import { db } from "./config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

let allProducts = [];

document.addEventListener("DOMContentLoaded", () => {
    loadProductsAndFilters();
});

async function loadProductsAndFilters() {
    const container = document.getElementById("productsGrid");
    
    try {
        // Firestore se products collection get karna
        const snapshot = await getDocs(collection(db, "products"));
        allProducts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })).filter(product => product.active !== false); // Active products only

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

    // Set map use karke unique branches aur categories nikalna
    const branches = [...new Set(allProducts.map(p => p.branch).filter(Boolean))];
    const categories = [...new Set(allProducts.map(p => p.category).filter(Boolean))];

    // Options inject karna
    branchFilter.innerHTML = `<option value="all">All Branches</option>` + 
        branches.map(branch => `<option value="${branch}">${branch}</option>`).join("");

    categoryFilter.innerHTML = `<option value="all">All Categories</option>` + 
        categories.map(category => `<option value="${category}">${category}</option>`).join("");

    // Event listeners for change
    branchFilter.addEventListener("change", filterProducts);
    categoryFilter.addEventListener("change", filterProducts);
}

function filterProducts() {
    const selectedBranch = document.getElementById("branchFilter").value;
    const selectedCategory = document.getElementById("categoryFilter").value;

    let filtered = allProducts;

    // Branch filter apply karna
    if (selectedBranch !== "all") {
        filtered = filtered.filter(p => p.branch === selectedBranch);
    }

    // Category filter apply karna
    if (selectedCategory !== "all") {
        filtered = filtered.filter(p => p.category === selectedCategory);
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

    // UI card rendering
    productsToRender.forEach(p => {
        const image = p.image || p.images?.[0] || "assets/logos/JH-Logo-White.png";
        const price = Number(p.price || 0).toLocaleString("en-IN");
        const isOutOfStock = p.stock !== undefined && Number(p.stock) <= 0;

        container.innerHTML += `
        <div class="product-card glass-panel" data-product-id="${p.id}" style="min-width: unset; max-width: unset; aspect-ratio: unset; height: auto;">
            <button type="button" class="fav-icon" data-favorite="${p.id}" aria-label="Add to wishlist">
                <i class="ri-heart-line"></i>
            </button>
            
            <a href="product.html?id=${p.id}" class="product-img" style="aspect-ratio: 1; height: auto;">
                <img src="${image}" alt="${p.name}" loading="lazy" style="object-fit: cover;">
            </a>
            
            <div class="product-details" style="padding-top: 15px;">
                <div>
                    <h3 style="font-size: 1.1rem; margin-bottom: 5px;">${p.name}</h3>
                    <p class="price" style="color: var(--green);"> ₹${price}</p>
                    ${isOutOfStock ? `<small style="color:#ff5555;">Out of stock</small>` : ""}
                </div>
                
                <button type="button" class="cart-add-btn" data-add-to-cart="${p.id}" ${isOutOfStock ? "disabled" : ""}>
                    <i class="ri-shopping-cart-2-line"></i>
                </button>
            </div>
        </div>
        `;
    });

    // Re-bind Add to Cart buttons (Integrating with your existing script.js cart logic)
    container.querySelectorAll("[data-add-to-cart]").forEach(button => {
        button.onclick = async (event) => {
            event.preventDefault();
            event.stopPropagation();
            if(window.addProductToCart) {
                await window.addProductToCart(button.dataset.addToCart);
            }
        };
    });
}