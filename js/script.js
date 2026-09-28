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