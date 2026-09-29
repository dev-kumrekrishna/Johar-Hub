// js/script.js
// ============================================================
// JOHAR HUB - MAIN SCRIPT
// Works with <script src="js/script.js"></script>
// No ES-module syntax is used here so the existing index.html
// can load this file normally.
// ============================================================

(function () {
    "use strict";

    let auth = null;
    let db = null;
    let resolveStorageUrl = (value) => value || "";
    let addCacheBust = (value) => value || "";

    let onAuthStateChanged = null;
    let signOut = null;

    let doc = null;
    let getDoc = null;
    let setDoc = null;
    let deleteDoc = null;
    let collection = null;
    let onSnapshot = null;

    let unsubscribeCart = null;
    let unsubscribeProducts = null;

    let currentItems = [];
    let currentProducts = [];

    const FIREBASE_VERSION = "12.0.0";

    // ============================================================
    // BOOTSTRAP
    // ============================================================

    async function bootstrap() {
        try {
            const configModule = await import("./config.js");

            auth = configModule.auth;
            db = configModule.db;

            if (typeof configModule.resolveStorageUrl === "function") {
                resolveStorageUrl = configModule.resolveStorageUrl;
            }

            if (typeof configModule.addCacheBust === "function") {
                addCacheBust = configModule.addCacheBust;
            }

            const authModule = await import(
                `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`
            );

            const firestoreModule = await import(
                `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
            );

            onAuthStateChanged = authModule.onAuthStateChanged;
            signOut = authModule.signOut;

            doc = firestoreModule.doc;
            getDoc = firestoreModule.getDoc;
            setDoc = firestoreModule.setDoc;
            deleteDoc = firestoreModule.deleteDoc;
            collection = firestoreModule.collection;
            onSnapshot = firestoreModule.onSnapshot;

            initUI();
            initAuthState();
            initCart();
            initProducts();

            console.log("[JH] Johar Hub initialized successfully.");
        } catch (error) {
            console.error("[JH] Main script initialization failed:", error);
        }
    }

    // ============================================================
    // COMMON HELPERS
    // ============================================================

    function esc(value = "") {
        return String(value).replace(/[&<>'"]/g, (char) => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#39;",
            '"': "&quot;"
        }[char]));
    }

    function safeStorageUrl(value) {
        if (!value) return "";

        const raw = String(value).trim();
        if (!raw) return "";

        try {
            const resolved = resolveStorageUrl(raw);
            return resolved || raw;
        } catch (error) {
            console.warn("[JH] Storage URL resolve failed:", raw, error);
            return raw;
        }
    }

    function cacheBustUrl(value) {
        if (!value) return "";

        try {
            return addCacheBust(value);
        } catch {
            const separator = value.includes("?") ? "&" : "?";
            return `${value}${separator}v=${Date.now()}`;
        }
    }

    function getProductImage(product) {
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

        const image = candidates.find(
            (item) => typeof item === "string" && item.trim()
        );

        return safeStorageUrl(image || "");
    }

    function formatPrice(value) {
        const number = Number(value || 0);
        return `₹${number.toLocaleString("en-IN")}`;
    }

    // ============================================================
    // UI INITIALIZATION
    // ============================================================

    function initUI() {
        initMobileMenu();
        initHeroSlider();
        initProductSlider();
        initFloatingJSS();
        initEscapeKey();
    }

    // ============================================================
    // MOBILE MENU
    // ============================================================

    function initMobileMenu() {
        const menuBtn = document.querySelector(".mobile-menu-btn");
        const nav = document.querySelector(".header-nav");

        if (!menuBtn || !nav) {
            console.warn("[JH] Mobile menu elements not found.");
            return;
        }

        if (menuBtn.dataset.jhMenuReady === "true") return;

        menuBtn.dataset.jhMenuReady = "true";

        // Existing CSS ko overwrite kiye bina mobile menu ko reliable banata hai.
        if (!document.getElementById("jhMobileMenuRuntimeStyles")) {
            const style = document.createElement("style");
            style.id = "jhMobileMenuRuntimeStyles";

            style.textContent = `
                @media (max-width: 900px) {
                    .header-nav.jh-mobile-open {
                        display: flex !important;
                        visibility: visible !important;
                        opacity: 1 !important;
                        pointer-events: auto !important;
                    }

                    .header-nav.jh-mobile-open > a,
                    .header-nav.jh-mobile-open > .mobile-user-profile,
                    .header-nav.jh-mobile-open > .script-studio-bubble {
                        visibility: visible !important;
                        opacity: 1 !important;
                    }

                    .header-nav.jh-mobile-open > a {
                        display: flex !important;
                    }

                    .header-nav.jh-mobile-open .mobile-user-profile {
                        display: flex !important;
                    }

                    body.jh-menu-open {
                        overflow: hidden;
                    }
                }

                .mobile-menu-btn {
                    cursor: pointer;
                    user-select: none;
                }
            `;

            document.head.appendChild(style);
        }

        menuBtn.setAttribute("role", "button");
        menuBtn.setAttribute("tabindex", "0");
        menuBtn.setAttribute("aria-label", "Open menu");
        menuBtn.setAttribute("aria-expanded", "false");

        function setMenu(open) {
            nav.classList.toggle("mobile-active", open);
            nav.classList.toggle("jh-mobile-open", open);

            menuBtn.classList.toggle("ri-menu-line", !open);
            menuBtn.classList.toggle("ri-close-line", open);

            menuBtn.setAttribute(
                "aria-expanded",
                String(open)
            );

            menuBtn.setAttribute(
                "aria-label",
                open ? "Close menu" : "Open menu"
            );

            document.body.classList.toggle(
                "jh-menu-open",
                open
            );
        }

        function toggleMenu(event) {
            event?.preventDefault();
            event?.stopPropagation();

            const isOpen =
                nav.classList.contains("jh-mobile-open");

            setMenu(!isOpen);
        }

        menuBtn.addEventListener("click", toggleMenu);

        menuBtn.addEventListener("keydown", (event) => {
            if (
                event.key === "Enter" ||
                event.key === " "
            ) {
                event.preventDefault();
                toggleMenu(event);
            }

            if (event.key === "Escape") {
                setMenu(false);
            }
        });

        nav.querySelectorAll("a").forEach((link) => {
            link.addEventListener("click", () => {
                setMenu(false);
            });
        });

        // Desktop par accidentally open na rahe.
        const media = window.matchMedia("(max-width: 900px)");

        function handleBreakpoint(event) {
            if (!event.matches) {
                setMenu(false);
            }
        }

        if (typeof media.addEventListener === "function") {
            media.addEventListener("change", handleBreakpoint);
        } else if (typeof media.addListener === "function") {
            media.addListener(handleBreakpoint);
        }

        console.log("[JH] Mobile menu initialized.");
    }

    // ============================================================
    // HERO SLIDER
    // ============================================================

    function initHeroSlider() {
        const slides = Array.from(
            document.querySelectorAll(".hero-text.slide")
        );

        const dots = Array.from(
            document.querySelectorAll(".hero-dots span")
        );

        const sidebarNums = Array.from(
            document.querySelectorAll(
                ".hero-sidebar span:not(.line)"
            )
        );

        if (!slides.length) {
            console.warn("[JH] Hero slides not found.");
            return;
        }

        let currentSlide = 0;
        let slideInterval = null;

        const AUTOPLAY_TIME = 5000;

        function showSlide(index) {
            if (index < 0) {
                index = slides.length - 1;
            }

            if (index >= slides.length) {
                index = 0;
            }

            slides.forEach((slide, i) => {
                slide.classList.toggle(
                    "active",
                    i === index
                );

                slide.setAttribute(
                    "aria-hidden",
                    i === index ? "false" : "true"
                );
            });

            dots.forEach((dot, i) => {
                dot.classList.toggle(
                    "active",
                    i === index
                );

                dot.setAttribute(
                    "aria-current",
                    i === index ? "true" : "false"
                );
            });

            sidebarNums.forEach((num, i) => {
                num.classList.toggle(
                    "active",
                    i === index
                );
            });

            currentSlide = index;
        }

        function nextSlide() {
            showSlide(
                (currentSlide + 1) % slides.length
            );
        }

        function previousSlide() {
            showSlide(
                (currentSlide - 1 + slides.length) %
                slides.length
            );
        }

        function stopAutoplay() {
            if (slideInterval) {
                clearInterval(slideInterval);
                slideInterval = null;
            }
        }

        function startAutoplay() {
            stopAutoplay();

            if (slides.length > 1) {
                slideInterval = setInterval(
                    nextSlide,
                    AUTOPLAY_TIME
                );
            }
        }

        function restartAutoplay() {
            startAutoplay();
        }

        dots.forEach((dot, index) => {
            dot.setAttribute("role", "button");
            dot.setAttribute("tabindex", "0");

            dot.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                showSlide(index);
                restartAutoplay();
            });

            dot.addEventListener("keydown", (event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    showSlide(index);
                    restartAutoplay();
                }
            });
        });

        sidebarNums.forEach((num, index) => {
            num.setAttribute("role", "button");
            num.setAttribute("tabindex", "0");

            num.addEventListener("click", (event) => {
                event.preventDefault();
                event.stopPropagation();

                showSlide(index);
                restartAutoplay();
            });

            num.addEventListener("keydown", (event) => {
                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    showSlide(index);
                    restartAutoplay();
                }
            });
        });

        document.addEventListener("keydown", (event) => {
            if (
                event.target &&
                typeof event.target.matches === "function" &&
                event.target.matches(
                    "input, textarea, select, [contenteditable='true']"
                )
            ) {
                return;
            }

            if (event.key === "ArrowRight") {
                nextSlide();
                restartAutoplay();
            }

            if (event.key === "ArrowLeft") {
                previousSlide();
                restartAutoplay();
            }
        });

        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.hidden) {
                    stopAutoplay();
                } else {
                    startAutoplay();
                }
            }
        );

        showSlide(0);
        startAutoplay();

        console.log(
            `[JH] Hero slider initialized: ${slides.length} slides`
        );
    }

    // ============================================================
    // PRODUCT CAROUSEL
    // ============================================================

    function initProductSlider() {
        const slider =
            document.querySelector(".products-grid");

        const section =
            document.querySelector(".products-carousel");

        if (!slider || !section) return;

        const cards = Array.from(
            slider.querySelectorAll(".product-card")
        );

        if (cards.length <= 1) return;

        let currentX = 0;
        let startX = 0;
        let startPosition = 0;

        let isDragging = false;
        let pointerId = null;

        let wheelLocked = false;

        slider.style.touchAction = "pan-y";

        function getStep() {
            const firstCard = cards[0];

            if (!firstCard) return 0;

            const cardWidth =
                firstCard.getBoundingClientRect().width;

            const styles =
                window.getComputedStyle(slider);

            const gap =
                parseFloat(styles.columnGap || styles.gap) || 0;

            return cardWidth + gap;
        }

        function getMaxPosition() {
            return Math.max(
                0,
                slider.scrollWidth - section.clientWidth
            );
        }

        function setPosition(
            position,
            animate = true
        ) {
            const max = getMaxPosition();

            position = Math.max(
                -max,
                Math.min(0, position)
            );

            currentX = position;

            slider.style.transition = animate
                ? "transform .45s cubic-bezier(.4,0,.2,1)"
                : "none";

            slider.style.transform =
                `translate3d(${currentX}px,0,0)`;
        }

        function snapToCard(direction) {
            const step = getStep();

            if (!step) return;

            const max = getMaxPosition();

            let nextPosition =
                direction === "next"
                    ? currentX - step
                    : currentX + step;

            nextPosition = Math.max(
                -max,
                Math.min(0, nextPosition)
            );

            setPosition(nextPosition);
        }

        section.addEventListener(
            "wheel",
            (event) => {
                if (getMaxPosition() <= 0) return;

                event.preventDefault();

                if (wheelLocked) return;

                const delta =
                    Math.abs(event.deltaX) >
                    Math.abs(event.deltaY)
                        ? event.deltaX
                        : event.deltaY;

                if (Math.abs(delta) < 10) return;

                wheelLocked = true;

                if (delta > 0) {
                    snapToCard("next");
                } else {
                    snapToCard("previous");
                }

                window.setTimeout(() => {
                    wheelLocked = false;
                }, 450);
            },
            { passive: false }
        );

        slider.addEventListener(
            "pointerdown",
            (event) => {
                if (
                    event.pointerType === "mouse" &&
                    event.button !== 0
                ) {
                    return;
                }

                isDragging = true;
                pointerId = event.pointerId;
                startX = event.clientX;
                startPosition = currentX;

                slider.style.transition = "none";

                try {
                    slider.setPointerCapture(pointerId);
                } catch {}
            }
        );

        slider.addEventListener(
            "pointermove",
            (event) => {
                if (
                    !isDragging ||
                    event.pointerId !== pointerId
                ) {
                    return;
                }

                const movement =
                    event.clientX - startX;

                let newPosition =
                    startPosition + movement;

                const max = getMaxPosition();

                if (newPosition > 0) {
                    newPosition *= 0.25;
                }

                if (newPosition < -max) {
                    const extra =
                        newPosition + max;

                    newPosition =
                        -max + extra * 0.25;
                }

                currentX = newPosition;

                slider.style.transform =
                    `translate3d(${currentX}px,0,0)`;
            }
        );

        function finishDrag(event) {
            if (
                !isDragging ||
                event.pointerId !== pointerId
            ) {
                return;
            }

            isDragging = false;

            const movement =
                currentX - startPosition;

            const threshold = 50;

            if (Math.abs(movement) >= threshold) {
                snapToCard(
                    movement < 0
                        ? "next"
                        : "previous"
                );
            } else {
                setPosition(startPosition);
            }

            pointerId = null;
        }

        slider.addEventListener(
            "pointerup",
            finishDrag
        );

        slider.addEventListener(
            "pointercancel",
            finishDrag
        );

        slider.querySelectorAll("img").forEach((img) => {
            img.draggable = false;
        });

        window.addEventListener("resize", () => {
            const max = getMaxPosition();

            if (Math.abs(currentX) > max) {
                setPosition(-max, false);
            }
        });

        setPosition(0, false);
    }

    // ============================================================
    // FIREBASE AUTH STATE
    // ============================================================

    function initAuthState() {
        if (
            !auth ||
            typeof onAuthStateChanged !== "function"
        ) {
            console.error("[JH] Firebase Auth unavailable.");
            return;
        }

        const loginBtn =
            document.getElementById("loginBtn");

        const desktopUserBadge =
            document.getElementById("desktopUserBadge");

        const mobileAuthBlock =
            document.getElementById("mobileAuthBlock");

        const mobileLogoutBtn =
            document.getElementById("mobileLogoutBtn");

        onAuthStateChanged(auth, async (user) => {
            if (user) {
                if (loginBtn) {
                    loginBtn.style.display = "none";
                }

                if (desktopUserBadge) {
                    desktopUserBadge.style.display = "flex";
                }

                if (mobileAuthBlock) {
                    mobileAuthBlock.style.display = "flex";
                }

                if (mobileLogoutBtn) {
                    mobileLogoutBtn.style.display = "block";
                }

                await renderUserHeader(user);
            } else {
                if (loginBtn) {
                    loginBtn.style.display =
                        "inline-flex";
                }

                if (desktopUserBadge) {
                    desktopUserBadge.style.display =
                        "none";
                }

                if (mobileAuthBlock) {
                    mobileAuthBlock.style.display =
                        "none";
                }

                if (mobileLogoutBtn) {
                    mobileLogoutBtn.style.display =
                        "none";
                }

                setDefaultProfile();
            }

            bindCartButtons(user);
        });

        if (mobileLogoutBtn) {
            mobileLogoutBtn.addEventListener(
                "click",
                async (event) => {
                    event.preventDefault();

                    try {
                        await signOut(auth);
                        window.location.reload();
                    } catch (error) {
                        console.error(
                            "[JH] Logout failed:",
                            error
                        );
                    }
                }
            );
        }
    }

    async function renderUserHeader(user) {
        let userName = "Johar User";

        let pfpUrl =
            `https://ui-avatars.com/api/?name=${
                encodeURIComponent(user.email || "Johar User")
            }&background=08fb8f&color=000`;

        try {
            if (db && getDoc && doc) {
                const userDoc = await getDoc(
                    doc(db, "users", user.uid)
                );

                if (userDoc.exists()) {
                    const data = userDoc.data();

                    userName =
                        data.name ||
                        data.fullName ||
                        userName;

                    const storedPfp =
                        data.pfp ||
                        data.avatar ||
                        data.avatar_url ||
                        data.photoURL;

                    if (storedPfp) {
                        pfpUrl =
                            cacheBustUrl(
                                safeStorageUrl(storedPfp)
                            );
                    }
                }
            }
        } catch (error) {
            console.error(
                "[JH] Error fetching user header data:",
                error
            );
        }

        const desktopName =
            document.getElementById("desktopUserName");

        const desktopPfp =
            document.getElementById("desktopPfp");

        const mobileName =
            document.getElementById("mobileUserName");

        const mobileEmail =
            document.getElementById("mobileEmail");

        const mobilePfp =
            document.getElementById("mobilePfp");

        if (desktopName) {
            desktopName.textContent =
                userName.split(/\s+/)[0] ||
                "Profile";
        }

        if (desktopPfp) {
            desktopPfp.src = pfpUrl;
        }

        if (mobileName) {
            mobileName.textContent = userName;
        }

        if (mobileEmail) {
            mobileEmail.textContent =
                user.email || "";
        }

        if (mobilePfp) {
            mobilePfp.src = pfpUrl;
        }

        // Broken PFP ko automatically fallback do.
        [desktopPfp, mobilePfp].forEach((img) => {
            if (!img) return;

            img.onerror = () => {
                img.onerror = null;
                img.src =
                    `https://ui-avatars.com/api/?name=${
                        encodeURIComponent(userName)
                    }&background=08fb8f&color=000`;
            };
        });
    }

    function setDefaultProfile() {
        const desktopPfp =
            document.getElementById("desktopPfp");

        const mobilePfp =
            document.getElementById("mobilePfp");

        if (desktopPfp) desktopPfp.removeAttribute("src");
        if (mobilePfp) mobilePfp.removeAttribute("src");

        const mobileName =
            document.getElementById("mobileUserName");

        const mobileEmail =
            document.getElementById("mobileEmail");

        if (mobileName) {
            mobileName.textContent = "Johar User";
        }

        if (mobileEmail) {
            mobileEmail.textContent = "";
        }
    }

    // ============================================================
    // REAL FIRESTORE PRODUCTS
    // ============================================================

    function initProducts() {
        const grid =
            document.querySelector(".products-grid");

        if (!grid) return;

        if (!db || !collection || !onSnapshot) {
            console.error(
                "[JH] Firestore product system unavailable."
            );
            return;
        }

        unsubscribeProducts?.();

        unsubscribeProducts = onSnapshot(
            collection(db, "products"),
            (snapshot) => {
                currentProducts = snapshot.docs
                    .map((item) => ({
                        id: item.id,
                        ...item.data()
                    }))
                    .filter(
                        (product) =>
                            product.active !== false
                    );

                renderProducts();
            },
            (error) => {
                console.error(
                    "[JH] Products listener error:",
                    error
                );

                renderProductError();
            }
        );
    }

    function renderProducts() {
        const grid =
            document.querySelector(".products-grid");

        if (!grid) return;

        if (!currentProducts.length) {
            grid.innerHTML = `
                <div class="jh-products-empty">
                    <strong>No products available yet.</strong>
                    <span>Products will appear here when they are published.</span>
                </div>
            `;

            return;
        }

        grid.innerHTML =
            currentProducts
                .map(renderProductCard)
                .join("");

        bindProductActions();
        initProductSlider();
    }

    function renderProductError() {
        const grid =
            document.querySelector(".products-grid");

        if (!grid) return;

        grid.innerHTML = `
            <div class="jh-products-empty">
                <strong>Products could not be loaded.</strong>
                <span>Please refresh and try again.</span>
            </div>
        `;
    }

    function renderProductCard(product) {
        const image =
            cacheBustUrl(
                getProductImage(product)
            );

        const name =
            product.name ||
            product.title ||
            "Untitled Product";

        const price =
            Number(
                product.price ??
                product.salePrice ??
                0
            );

        const oldPrice =
            product.compareAtPrice ??
            product.originalPrice ??
            null;

        const stock =
            product.stock === undefined ||
            product.stock === null
                ? null
                : Number(product.stock);

        const outOfStock =
            stock !== null && stock <= 0;

        const imageHTML = image
            ? `
                <img
                    src="${esc(image)}"
                    alt="${esc(name)}"
                    loading="lazy"
                    decoding="async"
                    draggable="false"
                    data-product-image
                >
            `
            : `
                <div class="img-placeholder">
                    JH
                </div>
            `;

        return `
            <div
                class="product-card glass-panel"
                data-product-id="${esc(product.id)}"
            >
                <button
                    type="button"
                    class="fav-icon"
                    data-favorite="${esc(product.id)}"
                    aria-label="Add ${esc(name)} to wishlist"
                >
                    <i class="ri-heart-line"></i>
                </button>

                <a
                    href="product-details.html?id=${encodeURIComponent(product.id)}"
                    class="product-img"
                    aria-label="View ${esc(name)}"
                >
                    ${imageHTML}
                </a>

                <div class="product-details">
                    <div>
                        <h3>${esc(name)}</h3>

                        <p class="price">
                            ${formatPrice(price)}

                            ${
                                oldPrice !== null &&
                                Number(oldPrice) > price
                                    ? `
                                        <del style="opacity:.45;font-size:.8em;margin-left:5px;">
                                            ${formatPrice(oldPrice)}
                                        </del>
                                    `
                                    : ""
                            }
                        </p>

                        ${
                            outOfStock
                                ? `<small style="color:#ff5555;">Out of stock</small>`
                                : ""
                        }
                    </div>

                    <button
                        type="button"
                        class="cart-add-btn"
                        data-add-to-cart="${esc(product.id)}"
                        ${outOfStock ? "disabled" : ""}
                        aria-label="Add ${esc(name)} to cart"
                    >
                        <i class="ri-shopping-cart-2-line"></i>
                    </button>
                </div>
            </div>
        `;
    }

    function bindProductActions() {
        document
            .querySelectorAll("[data-add-to-cart]")
            .forEach((button) => {
                button.onclick = async (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    const productId =
                        button.dataset.addToCart;

                    await addProductToCart(
                        productId
                    );
                };
            });

        document
            .querySelectorAll("[data-favorite]")
            .forEach((button) => {
                button.onclick = (event) => {
                    event.preventDefault();
                    event.stopPropagation();

                    toggleWishlist(
                        button.dataset.favorite,
                        button
                    );
                };
            });

        document
            .querySelectorAll("[data-product-image]")
            .forEach((image) => {
                image.onerror = () => {
                    image.onerror = null;

                    const placeholder =
                        document.createElement("div");

                    placeholder.className =
                        "img-placeholder";

                    placeholder.textContent = "JH";

                    image.replaceWith(
                        placeholder
                    );
                };
            });

        restoreWishlistState();
    }

    // ============================================================
    // SIMPLE WISHLIST STATE
    // ============================================================

    function getWishlist() {
        try {
            return JSON.parse(
                localStorage.getItem(
                    "johar_wishlist"
                )
            ) || [];
        } catch {
            return [];
        }
    }

    function saveWishlist(list) {
        localStorage.setItem(
            "johar_wishlist",
            JSON.stringify(list)
        );
    }

    function toggleWishlist(productId, button) {
        const list = getWishlist();

        const index =
            list.indexOf(productId);

        const icon =
            button.querySelector("i");

        if (index === -1) {
            list.push(productId);
            button.classList.add("active");

            if (icon) {
                icon.className =
                    "ri-heart-fill";
            }
        } else {
            list.splice(index, 1);
            button.classList.remove("active");

            if (icon) {
                icon.className =
                    "ri-heart-line";
            }
        }

        saveWishlist(list);
    }

    function restoreWishlistState() {
        const list = getWishlist();

        document
            .querySelectorAll("[data-favorite]")
            .forEach((button) => {
                const id =
                    button.dataset.favorite;

                const icon =
                    button.querySelector("i");

                if (list.includes(id)) {
                    button.classList.add("active");

                    if (icon) {
                        icon.className =
                            "ri-heart-fill";
                    }
                }
            });
    }

    // ============================================================
    // REAL FIRESTORE CART
    // ============================================================

    function cartRef(uid) {
        return collection(
            db,
            "carts",
            uid,
            "items"
        );
    }

    function updateBadge(count) {
        document
            .querySelectorAll(".cart-badge")
            .forEach((badge) => {
                badge.textContent =
                    String(count);

                badge.hidden =
                    count <= 0;
            });
    }

    function ensureCartStyles() {
        if (
            document.getElementById(
                "jhCartStyles"
            )
        ) {
            return;
        }

        const style =
            document.createElement("style");

        style.id = "jhCartStyles";

        style.textContent = `
            #jhCartOverlay{
                position:fixed;
                inset:0;
                background:rgba(0,0,0,.68);
                z-index:9998;
                opacity:0;
                pointer-events:none;
                transition:.25s;
            }

            #jhCartDrawer{
                position:fixed;
                top:0;
                right:0;
                width:min(440px,94vw);
                height:100dvh;
                background:#050707;
                color:#fff;
                z-index:9999;
                transform:translateX(105%);
                transition:.3s;
                display:flex;
                flex-direction:column;
                border-left:1px solid rgba(8,251,143,.22);
                box-shadow:-20px 0 60px #000;
            }

            #jhCartDrawer.open{
                transform:translateX(0);
            }

            #jhCartOverlay.open{
                opacity:1;
                pointer-events:auto;
            }

            .jh-cart-head{
                display:flex;
                align-items:center;
                justify-content:space-between;
                padding:22px 20px;
                border-bottom:1px solid #1b2420;
            }

            .jh-cart-head button{
                background:none;
                border:0;
                color:#fff;
                font-size:28px;
                cursor:pointer;
            }

            .jh-cart-list{
                padding:12px 20px;
                overflow:auto;
                flex:1;
            }

            .jh-cart-item{
                display:grid;
                grid-template-columns:68px minmax(0,1fr) auto;
                gap:12px;
                align-items:center;
                padding:14px 0;
                border-bottom:1px solid #17201c;
            }

            .jh-cart-item img{
                width:68px;
                height:78px;
                object-fit:cover;
                border-radius:10px;
                background:#101514;
            }

            .jh-cart-name{
                font-weight:700;
                white-space:nowrap;
                overflow:hidden;
                text-overflow:ellipsis;
            }

            .jh-cart-price{
                color:#08fb8f;
                margin-top:5px;
            }

            .jh-qty{
                display:flex;
                align-items:center;
                gap:8px;
                margin-top:8px;
            }

            .jh-qty button{
                width:27px;
                height:27px;
                border:1px solid #26342e;
                background:#0b100e;
                color:#fff;
                border-radius:6px;
                cursor:pointer;
            }

            .jh-remove{
                background:none;
                border:0;
                color:#ff5555;
                cursor:pointer;
                font-size:20px;
            }

            .jh-cart-foot{
                padding:20px;
                border-top:1px solid #1b2420;
            }

            .jh-total{
                display:flex;
                justify-content:space-between;
                font-size:18px;
                margin-bottom:15px;
            }

            .jh-checkout{
                width:100%;
                border:0;
                border-radius:12px;
                padding:14px;
                background:#08fb8f;
                color:#00150c;
                font-weight:800;
                cursor:pointer;
            }

            .jh-cart-note{
                font-size:.78rem;
                color:#87918c;
                margin-top:8px;
                text-align:center;
            }

            .jh-products-empty{
                width:100%;
                min-width:280px;
                padding:50px 25px;
                display:flex;
                flex-direction:column;
                gap:8px;
                text-align:center;
                color:#fff;
            }

            .jh-products-empty span{
                color:#87918c;
            }

            .cart-add-btn:disabled{
                opacity:.4;
                cursor:not-allowed;
            }

            [data-favorite].active{
                color:#08fb8f;
            }
        `;

        document.head.appendChild(style);
    }

    function ensureCartDrawer() {
        if (
            document.getElementById(
                "jhCartDrawer"
            )
        ) {
            return;
        }

        ensureCartStyles();

        document.body.insertAdjacentHTML(
            "beforeend",
            `
                <div id="jhCartOverlay"></div>

                <aside
                    id="jhCartDrawer"
                    aria-label="Shopping cart"
                    aria-hidden="true"
                >
                    <div class="jh-cart-head">
                        <h2 style="margin:0">
                            Your Cart
                        </h2>

                        <button
                            type="button"
                            id="jhCartClose"
                            aria-label="Close cart"
                        >
                            ×
                        </button>
                    </div>

                    <div
                        class="jh-cart-list"
                        id="jhCartList"
                    ></div>

                    <div class="jh-cart-foot">
                        <div class="jh-total">
                            <span>Total</span>
                            <strong id="jhCartTotal">
                                ₹0
                            </strong>
                        </div>

                        <button
                            type="button"
                            class="jh-checkout"
                            id="jhCheckout"
                        >
                            Checkout
                        </button>

                        <div class="jh-cart-note">
                            Checkout/order system can be
                            connected to Razorpay later.
                        </div>
                    </div>
                </aside>
            `
        );

        document
            .getElementById("jhCartClose")
            ?.addEventListener(
                "click",
                closeCart
            );

        document
            .getElementById("jhCartOverlay")
            ?.addEventListener(
                "click",
                closeCart
            );

        document
            .getElementById("jhCheckout")
            ?.addEventListener(
                "click",
                handleCheckout
            );
    }

    function openCart() {
        ensureCartDrawer();

        const drawer =
            document.getElementById(
                "jhCartDrawer"
            );

        const overlay =
            document.getElementById(
                "jhCartOverlay"
            );

        drawer?.classList.add("open");

        drawer?.setAttribute(
            "aria-hidden",
            "false"
        );

        overlay?.classList.add("open");

        document.body.classList.add(
            "jh-cart-open"
        );
    }

    function closeCart() {
        const drawer =
            document.getElementById(
                "jhCartDrawer"
            );

        const overlay =
            document.getElementById(
                "jhCartOverlay"
            );

        drawer?.classList.remove("open");

        drawer?.setAttribute(
            "aria-hidden",
            "true"
        );

        overlay?.classList.remove("open");

        document.body.classList.remove(
            "jh-cart-open"
        );
    }

    async function handleCheckout() {
        if (!currentItems.length) {
            alert("Your cart is empty.");
            return;
        }

        // Real cart is already saved in Firestore.
        // Payment/order creation can be connected here later.
        alert(
            "Your cart is saved. Checkout/order creation will be connected next."
        );
    }

    function renderCart() {
        ensureCartDrawer();

        const list =
            document.getElementById(
                "jhCartList"
            );

        const totalEl =
            document.getElementById(
                "jhCartTotal"
            );

        if (!list || !totalEl) return;

        if (!currentItems.length) {
            list.innerHTML = `
                <p style="
                    color:#87918c;
                    text-align:center;
                    padding:50px 10px;
                ">
                    Your cart is empty.
                </p>
            `;

            totalEl.textContent = "₹0";
            updateBadge(0);

            return;
        }

        let total = 0;
        let count = 0;

        list.innerHTML =
            currentItems
                .map((item) => {
                    const price =
                        Number(item.price || 0);

                    const quantity =
                        Math.max(
                            1,
                            Number(
                                item.quantity || 1
                            )
                        );

                    total +=
                        price * quantity;

                    count += quantity;

                    const image =
                        cacheBustUrl(
                            safeStorageUrl(
                                item.image
                            )
                        );

                    const imageSrc =
                        image ||
                        "assets/logos/JH-Logo-White.png";

                    return `
                        <div class="jh-cart-item">
                            <img
                                src="${esc(imageSrc)}"
                                alt="${esc(
                                    item.name ||
                                    "Product"
                                )}"
                                onerror="
                                    this.onerror=null;
                                    this.src='assets/logos/JH-Logo-White.png';
                                "
                            >

                            <div>
                                <div class="jh-cart-name">
                                    ${esc(
                                        item.name ||
                                        "Product"
                                    )}
                                </div>

                                <div class="jh-cart-price">
                                    ${formatPrice(price)}
                                </div>

                                <div class="jh-qty">
                                    <button
                                        type="button"
                                        data-minus="${esc(
                                            item.id
                                        )}"
                                        aria-label="Decrease quantity"
                                    >
                                        −
                                    </button>

                                    <span>
                                        ${quantity}
                                    </span>

                                    <button
                                        type="button"
                                        data-plus="${esc(
                                            item.id
                                        )}"
                                        aria-label="Increase quantity"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <button
                                type="button"
                                class="jh-remove"
                                data-remove="${esc(
                                    item.id
                                )}"
                                aria-label="Remove item"
                            >
                                ×
                            </button>
                        </div>
                    `;
                })
                .join("");

        totalEl.textContent =
            formatPrice(total);

        updateBadge(count);

        list
            .querySelectorAll("[data-minus]")
            .forEach((button) => {
                button.onclick = () =>
                    changeQty(
                        button.dataset.minus,
                        -1
                    );
            });

        list
            .querySelectorAll("[data-plus]")
            .forEach((button) => {
                button.onclick = () =>
                    changeQty(
                        button.dataset.plus,
                        1
                    );
            });

        list
            .querySelectorAll("[data-remove]")
            .forEach((button) => {
                button.onclick = () =>
                    removeFromCart(
                        button.dataset.remove
                    );
            });
    }

    async function changeQty(
        productId,
        delta
    ) {
        const user =
            auth?.currentUser;

        if (!user) return;

        try {
            const ref =
                doc(
                    db,
                    "carts",
                    user.uid,
                    "items",
                    productId
                );

            const snap =
                await getDoc(ref);

            if (!snap.exists()) return;

            const quantity =
                Number(
                    snap.data().quantity || 1
                ) + delta;

            if (quantity <= 0) {
                await deleteDoc(ref);
            } else {
                await setDoc(
                    ref,
                    {
                        quantity,
                        updatedAt: new Date()
                    },
                    { merge: true }
                );
            }
        } catch (error) {
            console.error(
                "[JH] Cart quantity error:",
                error
            );
        }
    }

    async function removeFromCart(
        productId
    ) {
        const user =
            auth?.currentUser;

        if (!user) return;

        try {
            await deleteDoc(
                doc(
                    db,
                    "carts",
                    user.uid,
                    "items",
                    productId
                )
            );
        } catch (error) {
            console.error(
                "[JH] Cart remove error:",
                error
            );
        }
    }

    async function addProductToCart(
        productId
    ) {
        const user =
            auth?.currentUser;

        if (!user) {
            window.location.href =
                "auth.html";
            return;
        }

        try {
            const productSnap =
                await getDoc(
                    doc(
                        db,
                        "products",
                        productId
                    )
                );

            if (!productSnap.exists()) {
                alert(
                    "Product not found."
                );
                return;
            }

            const product =
                productSnap.data();

            if (product.active === false) {
                alert(
                    "This product is unavailable."
                );
                return;
            }

            const stock =
                product.stock === undefined ||
                product.stock === null
                    ? null
                    : Number(product.stock);

            if (
                stock !== null &&
                stock <= 0
            ) {
                alert(
                    "This product is out of stock."
                );
                return;
            }

            const ref =
                doc(
                    db,
                    "carts",
                    user.uid,
                    "items",
                    productId
                );

            const old =
                await getDoc(ref);

            const oldQty =
                old.exists()
                    ? Number(
                        old.data()
                            .quantity || 0
                    )
                    : 0;

            const newQty =
                oldQty + 1;

            if (
                stock !== null &&
                newQty > stock
            ) {
                alert(
                    `Only ${stock} item(s) available.`
                );
                return;
            }

            const image =
                getProductImage(product);

            await setDoc(
                ref,
                {
                    productId,
                    name:
                        product.name ||
                        product.title ||
                        "",

                    price:
                        Number(
                            product.price ??
                            product.salePrice ??
                            0
                        ),

                    image:
                        image || "",

                    quantity:
                        newQty,

                    updatedAt:
                        new Date()
                },
                { merge: true }
            );

            openCart();

        } catch (error) {
            console.error(
                "[JH] Add to cart error:",
                error
            );

            alert(
                "Could not add this product to cart."
            );
        }
    }

    function bindCartButtons(user) {
        ensureCartDrawer();

        document
            .querySelectorAll(".cart-wrapper")
            .forEach((button) => {
                if (
                    button.dataset.jhCartReady ===
                    "true"
                ) {
                    return;
                }

                button.dataset.jhCartReady =
                    "true";

                button.setAttribute(
                    "role",
                    "button"
                );

                button.setAttribute(
                    "tabindex",
                    "0"
                );

                button.setAttribute(
                    "aria-label",
                    "Shopping cart"
                );

                button.addEventListener(
                    "click",
                    (event) => {
                        event.preventDefault();

                        if (!auth?.currentUser) {
                            window.location.href =
                                "auth.html";
                            return;
                        }

                        openCart();
                    }
                );

                button.addEventListener(
                    "keydown",
                    (event) => {
                        if (
                            event.key === "Enter" ||
                            event.key === " "
                        ) {
                            event.preventDefault();
                            button.click();
                        }
                    }
                );
            });

        startCartListener(user);
    }

    function startCartListener(user) {
        if (unsubscribeCart) {
            unsubscribeCart();
            unsubscribeCart = null;
        }

        if (!user) {
            currentItems = [];
            renderCart();
            return;
        }

        if (
            !db ||
            !collection ||
            !onSnapshot
        ) {
            return;
        }

        unsubscribeCart =
            onSnapshot(
                cartRef(user.uid),
                (snapshot) => {
                    currentItems =
                        snapshot.docs.map(
                            (item) => ({
                                id: item.id,
                                ...item.data()
                            })
                        );

                    renderCart();
                },
                (error) => {
                    console.error(
                        "[JH] Cart listener error:",
                        error
                    );
                }
            );
    }

    function initCart() {
        ensureCartDrawer();

        if (
            !auth ||
            typeof onAuthStateChanged !==
                "function"
        ) {
            return;
        }

        onAuthStateChanged(
            auth,
            (user) => {
                bindCartButtons(user);
            }
        );

        window.addProductToCart =
            addProductToCart;

        window.openJoharCart =
            openCart;

        window.closeJoharCart =
            closeCart;
    }

    // ============================================================
    // FLOATING JSS BUTTON
    // ============================================================

    function initFloatingJSS() {
        document
            .querySelectorAll(
                ".floating-jss, .script-studio-bubble"
            )
            .forEach((link) => {
                link.addEventListener(
                    "click",
                    () => {
                        console.log(
                            "[JH] Opening Johar Script Studio."
                        );
                    }
                );
            });
    }

    // ============================================================
    // ESCAPE KEY
    // ============================================================

    function initEscapeKey() {
        document.addEventListener(
            "keydown",
            (event) => {
                if (event.key !== "Escape") {
                    return;
                }

                closeCart();

                const menu =
                    document.querySelector(
                        ".header-nav"
                    );

                const menuBtn =
                    document.querySelector(
                        ".mobile-menu-btn"
                    );

                if (
                    menu &&
                    menu.classList.contains(
                        "jh-mobile-open"
                    )
                ) {
                    menu.classList.remove(
                        "mobile-active"
                    );

                    menu.classList.remove(
                        "jh-mobile-open"
                    );

                    document.body.classList.remove(
                        "jh-menu-open"
                    );

                    if (menuBtn) {
                        menuBtn.classList.remove(
                            "ri-close-line"
                        );

                        menuBtn.classList.add(
                            "ri-menu-line"
                        );

                        menuBtn.setAttribute(
                            "aria-expanded",
                            "false"
                        );
                    }
                }
            }
        );
    }

    // ============================================================
    // PWA SERVICE WORKER
    // ============================================================

    function initPWA() {
        if (
            !("serviceWorker" in navigator)
        ) {
            return;
        }

        window.addEventListener(
            "load",
            async () => {
                try {
                    const registration =
                        await navigator.serviceWorker.register(
                            "./service-worker.js",
                            {
                                scope: "./"
                            }
                        );

                    console.log(
                        "[JH PWA] Service Worker registered:",
                        registration.scope
                    );

                    await registration.update();

                    registration.addEventListener(
                        "updatefound",
                        () => {
                            const worker =
                                registration.installing;

                            if (!worker) return;

                            worker.addEventListener(
                                "statechange",
                                () => {
                                    if (
                                        worker.state ===
                                        "installed" &&
                                        navigator.serviceWorker
                                            .controller
                                    ) {
                                        console.log(
                                            "[JH PWA] New version available."
                                        );
                                    }
                                }
                            );
                        }
                    );
                } catch (error) {
                    console.error(
                        "[JH PWA] Service Worker registration failed:",
                        error
                    );
                }
            }
        );
    }

    // ============================================================
    // START
    // ============================================================

    if (
        document.readyState ===
        "loading"
    ) {
        document.addEventListener(
            "DOMContentLoaded",
            bootstrap,
            { once: true }
        );
    } else {
        bootstrap();
    }

    initPWA();

})();
