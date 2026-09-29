// js/script.js
import { auth, db } from "./config.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // ================= FIREBASE AUTH STATE (Merged) =================
    const loginBtn = document.getElementById("loginBtn");
    const desktopUserBadge = document.getElementById("desktopUserBadge");
    const mobileAuthBlock = document.getElementById("mobileAuthBlock");
    const mobileLogoutBtn = document.getElementById("mobileLogoutBtn");

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            if (loginBtn) loginBtn.style.display = "none";
            if (desktopUserBadge) desktopUserBadge.style.display = "flex";
            if (mobileAuthBlock) mobileAuthBlock.style.display = "flex";
            if (mobileLogoutBtn) mobileLogoutBtn.style.display = "block";
            
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                let userName = "Johar User";
                let pfpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}&background=08fb8f&color=000`;
                
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    userName = data.name || userName;
                    if(data.pfp) {
                        pfpUrl = data.pfp + "?t=" + Date.now();
                    }
                }
                
                if(document.getElementById("desktopUserName")) document.getElementById("desktopUserName").textContent = userName.split(" ")[0];
                if(document.getElementById("desktopPfp")) document.getElementById("desktopPfp").src = pfpUrl;
                if(document.getElementById("mobileUserName")) document.getElementById("mobileUserName").textContent = userName;
                if(document.getElementById("mobileEmail")) document.getElementById("mobileEmail").textContent = user.email;
                if(document.getElementById("mobilePfp")) document.getElementById("mobilePfp").src = pfpUrl;
            } catch (err) {
                console.error("Error fetching user header data:", err);
            }
        } else {
            if (loginBtn) loginBtn.style.display = "inline-flex";
            if (desktopUserBadge) desktopUserBadge.style.display = "none";
            if (mobileAuthBlock) mobileAuthBlock.style.display = "none";
            if (mobileLogoutBtn) mobileLogoutBtn.style.display = "none";
        }
    });

    if (mobileLogoutBtn) {
        mobileLogoutBtn.addEventListener("click", async (e) => {
            e.preventDefault();
            await signOut(auth);
            window.location.reload();
        });
    }

    // ================= HERO SLIDER LOGIC =================
    let currentSlide = 0;
    const slides = document.querySelectorAll('.hero-text.slide');
    const dots = document.querySelectorAll('.hero-dots span');
    const sidebarNums = document.querySelectorAll('.hero-sidebar span:not(.line)');

    if(slides.length > 0) {
        function showSlide(index) {
            slides.forEach(slide => slide.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            sidebarNums.forEach(num => num.classList.remove('active'));
            
            slides[index].classList.add('active');
            dots[index].classList.add('active');
            if(sidebarNums[index]) {
                sidebarNums[index].classList.add('active');
            }
            currentSlide = index;
        }

        function nextSlide() {
            let next = (currentSlide + 1) % slides.length;
            showSlide(next);
        }

        let slideInterval = setInterval(nextSlide, 4000);

        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                clearInterval(slideInterval);
                showSlide(index);
                slideInterval = setInterval(nextSlide, 4000);
            });
        });

        sidebarNums.forEach((num, index) => {
            num.addEventListener('click', () => {
                clearInterval(slideInterval);
                showSlide(index);
                slideInterval = setInterval(nextSlide, 4000);
            });
        });
    }

    // ================= MOBILE MENU =================
    const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
    const headerNav = document.querySelector(".header-nav");

    if (mobileMenuBtn && headerNav) {
        mobileMenuBtn.addEventListener("click", () => {
            headerNav.classList.toggle("mobile-active");
            if (headerNav.classList.contains("mobile-active")) {
                mobileMenuBtn.classList.remove("ri-menu-line");
                mobileMenuBtn.classList.add("ri-close-line");
            } else {
                mobileMenuBtn.classList.remove("ri-close-line");
                mobileMenuBtn.classList.add("ri-menu-line");
            }
        });

        headerNav.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                headerNav.classList.remove("mobile-active");
                mobileMenuBtn.classList.remove("ri-close-line");
                mobileMenuBtn.classList.add("ri-menu-line");
            });
        });
    }

    // ================= PRODUCT INTERACTION SLIDER =================
    const slider = document.querySelector(".products-grid");
    const section = document.querySelector(".products-carousel");

    if (slider && section && slider.querySelectorAll(".product-card").length > 1) {
        let currentX = 0;
        let startX = 0;
        let startPosition = 0;
        let isDragging = false;
        let pointerId = null;
        let wheelLocked = false;
        const cards = Array.from(slider.querySelectorAll(".product-card"));

        slider.style.touchAction = "pan-y";

        function getStep() {
            const cardWidth = cards[0].getBoundingClientRect().width;
            const gap = parseFloat(window.getComputedStyle(slider).gap) || 0;
            return cardWidth + gap;
        }

        function getMaxPosition() {
            const max = slider.scrollWidth - section.clientWidth;
            return Math.max(0, max);
        }

        function setPosition(position, animate = true) {
            const max = getMaxPosition();
            if (position > 0) position = 0;
            if (position < -max) position = -max;
            
            currentX = position;
            slider.style.transition = animate ? "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)" : "none";
            slider.style.transform = `translateX(${currentX}px)`;
        }

        function snapToCard(direction) {
            const step = getStep();
            const max = getMaxPosition();
            let nextPosition = direction === "next" ? currentX - step : currentX + step;

            if (nextPosition > 0) nextPosition = 0;
            if (nextPosition < -max) nextPosition = -max;

            setPosition(nextPosition);
        }

        section.addEventListener("wheel", (event) => {
            event.preventDefault();
            if (wheelLocked) return;

            let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
            if (Math.abs(delta) < 10) return;
            
            wheelLocked = true;
            if (delta > 0) snapToCard("next");
            else snapToCard("previous");

            setTimeout(() => { wheelLocked = false; }, 450);
        }, { passive: false });

        slider.addEventListener("pointerdown", (event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            isDragging = true;
            pointerId = event.pointerId;
            startX = event.clientX;
            startPosition = currentX;
            slider.style.transition = "none";
            slider.setPointerCapture(pointerId);
        });

        slider.addEventListener("pointermove", (event) => {
            if (!isDragging || event.pointerId !== pointerId) return;
            const movement = event.clientX - startX;
            let newPosition = startPosition + movement;
            const max = getMaxPosition();

            if (newPosition > 0) newPosition = newPosition * 0.25;
            if (newPosition < -max) newPosition = -max + (newPosition + max) * 0.25;

            currentX = newPosition;
            slider.style.transform = `translateX(${currentX}px)`;
        });

        const finishDrag = (event) => {
            if (!isDragging || event.pointerId !== pointerId) return;
            isDragging = false;
            const movement = currentX - startPosition;
            const threshold = 50;

            if (Math.abs(movement) >= threshold) {
                if (movement < 0) snapToCard("next");
                else snapToCard("previous");
            } else {
                setPosition(startPosition);
            }
            pointerId = null;
        };

        slider.addEventListener("pointerup", finishDrag);
        slider.addEventListener("pointercancel", finishDrag);

        slider.querySelectorAll("img").forEach(img => img.setAttribute("draggable", "false"));

        window.addEventListener("resize", () => {
            const max = getMaxPosition();
            if (Math.abs(currentX) > max) setPosition(-max, false);
        });

        setPosition(0, false);
    }
});

// R2 Bucket PFP Render Logic (Firebase Friendly)
function renderPfp(r2Url, userEmail) {
    // Default fallback agar R2 bucket me image nahi hai
    let finalPfpUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=08fb8f&color=000`;

    // Agar R2 bucket ka URL database me maujood hai
    if (r2Url && r2Url.trim() !== "") {
        // Cache buster lagaya taaki same URL pe new image turant load ho
        finalPfpUrl = `${r2Url}?t=${Date.now()}`;
    }

    // Sabhi image tags ko ek sath update karne ki list
    const pfpElements = ['mainProfilePic', 'desktopPfp', 'mobilePfp'];

    pfpElements.forEach(id => {
        const imgElement = document.getElementById(id);
        if (imgElement) {
            imgElement.src = finalPfpUrl;
            
            // Image load fail hone par fallback (agar R2 link break ho jaye)
            imgElement.onerror = () => {
                imgElement.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(userEmail)}&background=08fb8f&color=000`;
            };
        }
    });
}

// ================= PWA REGISTRATION =================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', { scope: '/' });
            console.log('[JH PWA] Service Worker registered:', registration.scope);
            await registration.update();
        } catch (error) {
            console.error('[JH PWA] Service Worker registration failed:', error);
        }
    });
}



document.addEventListener("DOMContentLoaded", () => {
            let currentSlide = 0;
            const slides = document.querySelectorAll('.hero-text.slide');
            const dots = document.querySelectorAll('.hero-dots span');
            const sidebarNums = document.querySelectorAll('.hero-sidebar span:not(.line)');

            if(slides.length > 0) {
                function showSlide(index) {
                    // Slides hide/show
                    slides.forEach(slide => slide.classList.remove('active'));
                    dots.forEach(dot => dot.classList.remove('active'));
                    sidebarNums.forEach(num => num.classList.remove('active'));
                    
                    // Current active
                    slides[index].classList.add('active');
                    dots[index].classList.add('active');
                    if(sidebarNums[index]) {
                        sidebarNums[index].classList.add('active');
                    }
                    currentSlide = index;
                }

                function nextSlide() {
                    let next = (currentSlide + 1) % slides.length;
                    showSlide(next);
                }

                // Har 4 second mein slide change
                let slideInterval = setInterval(nextSlide, 4000);

                // Dots click logic
                dots.forEach((dot, index) => {
                    dot.addEventListener('click', () => {
                        clearInterval(slideInterval);
                        showSlide(index);
                        slideInterval = setInterval(nextSlide, 4000);
                    });
                });

                // Sidebar numbers click logic (agar user number par click kare toh)
                sidebarNums.forEach((num, index) => {
                    num.addEventListener('click', () => {
                        clearInterval(slideInterval);
                        showSlide(index);
                        slideInterval = setInterval(nextSlide, 4000);
                    });
                });
            }
        });
        
        // ================= MOBILE MENU =================

const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
const headerNav = document.querySelector(".header-nav");

if (mobileMenuBtn && headerNav) {

    mobileMenuBtn.addEventListener("click", () => {

        headerNav.classList.toggle("mobile-active");

        // Menu icon change
        if (headerNav.classList.contains("mobile-active")) {
            mobileMenuBtn.classList.remove("ri-menu-line");
            mobileMenuBtn.classList.add("ri-close-line");
        } else {
            mobileMenuBtn.classList.remove("ri-close-line");
            mobileMenuBtn.classList.add("ri-menu-line");
        }

    });


    // Link click karne ke baad menu automatically close
    headerNav.querySelectorAll("a").forEach(link => {

        link.addEventListener("click", () => {

            headerNav.classList.remove("mobile-active");

            mobileMenuBtn.classList.remove("ri-close-line");
            mobileMenuBtn.classList.add("ri-menu-line");

        });

    });

}

// ================= PRODUCT INTERACTION SLIDER =================

document.addEventListener("DOMContentLoaded", () => {

    const slider = document.querySelector(".products-grid");
    const section = document.querySelector(".products-carousel");

    if (!slider || !section) return;

    const cards = Array.from(
        slider.querySelectorAll(".product-card")
    );

    if (cards.length <= 1) return;


    // ================= SETTINGS =================

    let currentX = 0;
    let startX = 0;
    let startPosition = 0;

    let isDragging = false;
    let pointerId = null;

    let wheelLocked = false;


    // Touchpad / touch ko browser ke
    // normal horizontal scrolling se control karenge
    slider.style.touchAction = "pan-y";


    // ================= CARD STEP =================

    function getStep() {

        const cardWidth =
            cards[0].getBoundingClientRect().width;

        const gap =
            parseFloat(
                window.getComputedStyle(slider).gap
            ) || 0;

        return cardWidth + gap;
    }


    // ================= MAX POSITION =================

    function getMaxPosition() {

        const max =
            slider.scrollWidth -
            section.clientWidth;

        return Math.max(0, max);

    }


    // ================= SET POSITION =================

    function setPosition(position, animate = true) {

        const max =
            getMaxPosition();


        // Left limit
        if (position > 0) {
            position = 0;
        }


        // Right limit
        if (position < -max) {
            position = -max;
        }


        currentX = position;


        slider.style.transition =
            animate
                ? "transform 0.45s cubic-bezier(0.4, 0, 0.2, 1)"
                : "none";


        slider.style.transform =
            `translateX(${currentX}px)`;

    }


    // ================= SNAP TO CARD =================

    function snapToCard(direction) {

        const step = getStep();

        const max =
            getMaxPosition();


        let nextPosition;


        if (direction === "next") {

            nextPosition =
                currentX - step;

        } else {

            nextPosition =
                currentX + step;

        }


        // Don't cross boundaries

        if (nextPosition > 0) {
            nextPosition = 0;
        }

        if (nextPosition < -max) {
            nextPosition = -max;
        }


        setPosition(nextPosition);

    }


    // ================= MOUSE WHEEL =================
    // Mouse wheel + laptop two-finger touchpad

    section.addEventListener(
        "wheel",
        (event) => {

            // Only react when cursor is inside
            // the product section

            event.preventDefault();


            if (wheelLocked) return;


            let delta;


            // Horizontal touchpad gesture
            if (
                Math.abs(event.deltaX) >
                Math.abs(event.deltaY)
            ) {

                delta = event.deltaX;

            }

            // Normal mouse wheel / vertical
            // touchpad gesture
            else {

                delta = event.deltaY;

            }


            // Very tiny touchpad movement ignore
            if (Math.abs(delta) < 10) {
                return;
            }


            wheelLocked = true;


            if (delta > 0) {

                snapToCard("next");

            } else {

                snapToCard("previous");

            }


            // Prevent too-fast multiple slides
            setTimeout(() => {

                wheelLocked = false;

            }, 450);

        },
        {
            passive: false
        }
    );


    // ================= POINTER DRAG =================
    // Mouse + laptop touchpad click-drag

    slider.addEventListener(
        "pointerdown",
        (event) => {

            // Only left mouse button
            if (
                event.pointerType === "mouse" &&
                event.button !== 0
            ) {
                return;
            }


            isDragging = true;

            pointerId =
                event.pointerId;

            startX =
                event.clientX;

            startPosition =
                currentX;


            slider.style.transition =
                "none";


            slider.setPointerCapture(
                pointerId
            );

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


            const max =
                getMaxPosition();


            // Small resistance at boundaries

            if (newPosition > 0) {

                newPosition =
                    newPosition * 0.25;

            }


            if (newPosition < -max) {

                const extra =
                    newPosition + max;

                newPosition =
                    -max + extra * 0.25;

            }


            currentX =
                newPosition;


            slider.style.transform =
                `translateX(${currentX}px)`;

        }
    );


    slider.addEventListener(
        "pointerup",
        finishDrag
    );


    slider.addEventListener(
        "pointercancel",
        finishDrag
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

            if (movement < 0) {

                snapToCard("next");

            } else {

                snapToCard("previous");

            }

        } else {

            // Return to original card position

            setPosition(
                startPosition
            );

        }


        pointerId = null;

    }


    // ================= PREVENT IMAGE DRAG =================

    slider.querySelectorAll("img").forEach(
        (img) => {

            img.setAttribute(
                "draggable",
                "false"
            );

        }
    );


    // ================= RESIZE =================

    window.addEventListener(
        "resize",
        () => {

            // Keep current position inside
            // the new available range

            const max =
                getMaxPosition();


            if (Math.abs(currentX) > max) {

                setPosition(
                    -max,
                    false
                );

            }

        }
    );


    // ================= INITIAL POSITION =================

    setPosition(
        0,
        false
    );

});

// js/script.js mein checkAuthState function ko is code se replace karein
async function checkAuthState() {
    const user = JSON.parse(localStorage.getItem("royal_current_user"));
    const navAuthLink = document.querySelector("#navAuthLink");
    const userAccountIcon = document.querySelector(".user-account-icon");
    const navbar = document.querySelector("#navbar");

    if (user) {
        if ((user.role === "admin" || user.role === "jd-host") && !document.querySelector("#adminDashLink")) {
            const dashboardLink = document.createElement("a");
            dashboardLink.id = "adminDashLink";
            dashboardLink.href = "dashboard.html";
            dashboardLink.innerHTML = '<i class="fa-solid fa-chart-pie"></i> Dashboard';
            navbar.insertBefore(dashboardLink, navAuthLink);
        }

        if(navAuthLink) {
            navAuthLink.innerHTML = '<i class="fa-solid fa-user"></i> My Profile';
            navAuthLink.href = "profile.html";
        }

        // Fetch PFP from Supabase and render in header
        if(userAccountIcon) {
            userAccountIcon.href = "profile.html";
            try {
                const { data } = await window.royalSupabase
                    .from('profiles')
                    .select('avatar_url')
                    .eq('id', user.id)
                    .single();

                if (data && data.avatar_url) {
                    userAccountIcon.innerHTML = `<img src="${data.avatar_url}" alt="Profile" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid var(--gold);">`;
                    userAccountIcon.style.padding = "0"; // Remove default icon padding
                    userAccountIcon.style.overflow = "hidden";
                }
            } catch (e) {
                console.error("Error loading header PFP:", e);
            }
        }
    } else {
        if(navAuthLink) {
            navAuthLink.textContent = "Login / Sign Up";
            navAuthLink.href = "login.html";
        }
        if(userAccountIcon) {
            userAccountIcon.href = "login.html";
            userAccountIcon.innerHTML = '<i class="fa-solid fa-user"></i>';
        }
    }
}


/* =========================================================
   JOHAR HUB PWA - SERVICE WORKER REGISTRATION
   ========================================================= */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/service-worker.js', {
                scope: '/'
            });
            console.log('[JH PWA] Service Worker registered:', registration.scope);
            
            // Check for updates
            await registration.update();
        } catch (error) {
            console.error('[JH PWA] Service Worker registration failed:', error);
        }
    });
}