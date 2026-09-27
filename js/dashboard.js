// js/dashboard.js
import { auth, db } from "./config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";
import { doc, getDoc, collection, addDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { uploadFile } from "./storage.js";

onAuthStateChanged(auth, async (user) => {
    if (!user) return window.location.href = "auth.html";
    const userDoc = await getDoc(doc(db, "users", user.uid));
    if (!userDoc.exists() || userDoc.data().role !== "admin") {
        alert("Access Denied. Admins only.");
        window.location.href = "profile.html";
    }
});

document.getElementById("productForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const btn = document.getElementById("saveProdBtn");
    const progressContainer = document.getElementById("uploadProgressContainer");
    const progressBar = document.getElementById("uploadProgressBar");
    const progressText = document.getElementById("uploadProgressText");

    btn.textContent = "Uploading...";
    btn.disabled = true;

    // Show Progress Bar
    progressContainer.style.display = "block";
    progressText.style.display = "block";
    progressBar.style.width = "0%";
    progressText.textContent = "0%";

    // Simulated Progress Animation Logic
    let progress = 0;
    const progressInterval = setInterval(() => {
        if (progress < 85) { // It will hover around 85% until the actual upload finishes
            progress += Math.floor(Math.random() * 10) + 5; 
            if(progress > 85) progress = 85;
            progressBar.style.width = progress + "%";
            progressText.textContent = progress + "%";
        }
    }, 300);

    try {
        const branch = document.getElementById("prodBranch").value;
        const name = document.getElementById("prodName").value;
        const price = document.getElementById("prodPrice").value;
        const desc = document.getElementById("prodDesc").value;
        const thumbnailFile = document.getElementById("prodThumbnail").files[0];

        if(!branch) throw new Error("Please select a branch.");

        // Upload to R2 / Storage
        const fileName = `${branch}_${Date.now()}`;
        const thumbnailUrl = await uploadFile(thumbnailFile, 'products', fileName);

        if(!thumbnailUrl) throw new Error("Image upload failed");

        // Save to Firestore Database
        await addDoc(collection(db, "products"), {
            branch: branch,
            name: name,
            price: Number(price),
            description: desc,
            thumbnail: thumbnailUrl,
            createdAt: new Date()
        });

        // Finish Progress to 100%
        clearInterval(progressInterval);
        progressBar.style.width = "100%";
        progressText.textContent = "100%";

        setTimeout(() => {
            alert("Product Added Successfully!");
            document.getElementById("productForm").reset();
            document.getElementById("productModal").classList.remove('active');
            
            // Reset Progress UI
            progressContainer.style.display = "none";
            progressText.style.display = "none";
            progressBar.style.width = "0%";
            btn.textContent = "Upload Product";
            btn.disabled = false;
        }, 500);

    } catch (error) {
        clearInterval(progressInterval);
        progressBar.style.background = "#ff4444"; // Red for error
        progressText.style.color = "#ff4444";
        progressText.textContent = "Upload Failed";

        console.error("Error adding product: ", error);
        alert(error.message || "Upload failed. Check console.");
        
        setTimeout(() => {
            progressContainer.style.display = "none";
            progressText.style.display = "none";
            progressBar.style.width = "0%";
            progressBar.style.background = "var(--green)";
            progressText.style.color = "var(--green)";
            btn.textContent = "Upload Product";
            btn.disabled = false;
        }, 2000);
    }
});