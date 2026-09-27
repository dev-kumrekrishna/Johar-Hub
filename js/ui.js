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