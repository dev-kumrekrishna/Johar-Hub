import { initializeApp } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyDa2BPadbGoD569ObwKrGR5oWT8guzx5W0",
    authDomain: "johar-hub.firebaseapp.com",
    projectId: "johar-hub",
    storageBucket: "johar-hub.firebasestorage.app",
    messagingSenderId: "210373758278",
    appId: "1:210373758278:web:ddeba056f22bd79c89a947",
    measurementId: "G-E723GPGY65"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Cloudflare R2 Worker. Images are served through the Worker, so a separate
// R2 public bucket URL is NOT required.
export const WORKER_URL = "https://johar-hub.dev-kumrekrishna.workers.dev";

export function resolveStorageUrl(value) {
    if (!value) return "";
    const raw = String(value).trim();
    if (!raw) return "";

    // Already a Worker URL.
    if (raw.startsWith(WORKER_URL + "/")) return raw;

    // Old/broken R2 public URL saved in Firestore: convert its pathname
    // to the Worker URL.
    try {
        const u = new URL(raw);
        if (u.hostname.endsWith(".r2.dev")) {
            return `${WORKER_URL}${u.pathname}`;
        }
        // External image URL: leave it alone.
        return raw;
    } catch {
        // Firestore may contain just an R2 object key, e.g. products/abc.webp
        return `${WORKER_URL}/${raw.replace(/^\/+/, "")}`;
    }
}

export function addCacheBust(url) {
    if (!url) return "";
    return `${url}${url.includes("?") ? "&" : "?"}v=${Date.now()}`;
}

export async function uploadFileToR2(file, folder, customFileName) {
    try {
        const ext = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "bin";
        const safeName = String(customFileName).trim().replace(/[^a-zA-Z0-9._-]/g, "-");
        const fileKey = `${folder}/${safeName}.${ext}`;

        const response = await fetch(`${WORKER_URL}/${fileKey}`, {
            method: "PUT",
            headers: { "Content-Type": file.type || "application/octet-stream" },
            body: file
        });

        if (!response.ok) {
            const message = await response.text().catch(() => "");
            throw new Error(`R2 upload failed (${response.status}) ${message}`);
        }

        // IMPORTANT: save Worker URL, NOT pub-xxxxxx.r2.dev.
        return `${WORKER_URL}/${fileKey}`;
    } catch (error) {
        console.error("R2 upload error:", error);
        return null;
    }
}

export const uploadPfp = (userId, file) => uploadFileToR2(file, "profiles", userId);
export const uploadProductImage = (productId, file, index = 0) =>
    uploadFileToR2(file, "products", `${productId}-${index}`);
