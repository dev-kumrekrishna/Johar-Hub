// ============================
// JOHAR Hub Navigation System
// ============================

const pages =
document.querySelectorAll(".page");

const navBtns =
document.querySelectorAll(".nav-btn");

// Open Page
window.navigateTo =
function(pageId){

    // Hide all pages
    pages.forEach(page=>{
        page.classList.remove("active");
    });

    // Open selected page
    const page =
    document.getElementById(pageId);

    if(page){
        page.classList.add("active");
    }

    // Bottom nav active state
    navBtns.forEach(btn=>{
        btn.classList.remove("active");
    });

    const clickedBtn =
    document.querySelector(
        `.nav-btn[onclick="navigateTo('${pageId}')"]`
    );

    if(clickedBtn){
        clickedBtn.classList.add("active");
    }

    // Scroll top
    window.scrollTo({
        top:0,
        behavior:"smooth"
    });

    // Save last page
    localStorage.setItem(
        "currentPage",
        pageId
    );
};

// Restore page after refresh
window.addEventListener(
    "DOMContentLoaded",
    ()=>{

        const savedPage =
        localStorage.getItem(
            "currentPage"
        );

        if(savedPage){
            navigateTo(savedPage);
        }else{
            navigateTo("home");
        }
    }
);

// Header/mobile fixes.
// The old script registered the mobile-menu click handler twice, so one tap
// could toggle the menu open and immediately closed. This capture handler owns
// the button and stops the duplicate bubble handlers.
(function () {
    function install() {
        const menu = document.querySelector(".mobile-menu-btn");
        const nav = document.querySelector(".header-nav");
        if (!menu || !nav || menu.dataset.jhHeaderFix) return;

        menu.dataset.jhHeaderFix = "1";
        menu.setAttribute("role", "button");
        menu.setAttribute("tabindex", "0");
        menu.setAttribute("aria-expanded", "false");

        document.addEventListener("click", event => {
            const target = event.target instanceof Element ? event.target.closest(".mobile-menu-btn") : null;
            if (target !== menu) return;

            event.preventDefault();
            event.stopImmediatePropagation();

            const open = nav.classList.toggle("mobile-active");
            menu.classList.toggle("ri-menu-line", !open);
            menu.classList.toggle("ri-close-line", open);
            menu.setAttribute("aria-expanded", String(open));
        }, true);

        menu.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                menu.click();
            }
        });

        nav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                nav.classList.remove("mobile-active");
                menu.classList.remove("ri-close-line");
                menu.classList.add("ri-menu-line");
                menu.setAttribute("aria-expanded", "false");
            });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", install, { once: true });
    } else {
        install();
    }
})();


// ================= JOHAR HUB MOBILE MENU =================

(function () {

    function initMobileMenu() {

        const menuBtn = document.querySelector(".mobile-menu-btn");
        const nav = document.querySelector(".header-nav");

        if (!menuBtn || !nav) {
            console.warn("[JH] Mobile menu elements not found.");
            return;
        }


        const authBlock = nav.querySelector("#mobileAuthBlock");

        if (authBlock && !authBlock.dataset.navSeparated) {

            const navigationLinks = Array.from(
                authBlock.children
            ).filter(element => element.tagName === "A");

            navigationLinks.forEach(link => {
                nav.appendChild(link);
            });

            authBlock.dataset.navSeparated = "true";

            console.log("[JH] Mobile navigation separated successfully.");
        }


        // =====================================================
        // PREVENT DUPLICATE INITIALIZATION
        // =====================================================

        if (menuBtn.dataset.jhMenuReady === "true") {
            return;
        }

        menuBtn.dataset.jhMenuReady = "true";


        // =====================================================
        // ACCESSIBILITY
        // =====================================================

        menuBtn.setAttribute("role", "button");
        menuBtn.setAttribute("tabindex", "0");
        menuBtn.setAttribute("aria-expanded", "false");


        // =====================================================
        // MENU TOGGLE
        // =====================================================

        function toggleMenu(event) {

            event?.preventDefault();

            const isOpen =
                nav.classList.toggle("mobile-active");

            // Menu icon ↔ Close icon
            menuBtn.classList.toggle(
                "ri-menu-line",
                !isOpen
            );

            menuBtn.classList.toggle(
                "ri-close-line",
                isOpen
            );

            menuBtn.setAttribute(
                "aria-expanded",
                String(isOpen)
            );
        }


        // =====================================================
        // CLICK
        // =====================================================

        menuBtn.addEventListener(
            "click",
            toggleMenu
        );


        // =====================================================
        // KEYBOARD SUPPORT
        // =====================================================

        menuBtn.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {

                    event.preventDefault();

                    toggleMenu(event);
                }

            }
        );


        // =====================================================
        // CLOSE MENU AFTER CLICKING ANY NAVIGATION LINK
        // =====================================================

        nav.querySelectorAll("a").forEach(link => {

            link.addEventListener(
                "click",
                () => {

                    nav.classList.remove(
                        "mobile-active"
                    );

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
            );

        });


        // =====================================================
        // ESC KEY → CLOSE MENU
        // =====================================================

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape" &&
                    nav.classList.contains("mobile-active")
                ) {

                    nav.classList.remove(
                        "mobile-active"
                    );

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
        );

    }


    // =========================================================
    // INITIALIZE
    // =========================================================

    if (document.readyState === "loading") {

        document.addEventListener(
            "DOMContentLoaded",
            initMobileMenu,
            { once: true }
        );

    } else {

        initMobileMenu();

    }

})();