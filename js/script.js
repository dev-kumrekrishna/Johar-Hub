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