// js/storage.js

// Tumhara Worker URL jo screenshot me diya hai
const WORKER_URL = "https://johar-hub.dev-kumrekrishna.workers.dev";
// R2 public domain (Images show karne ke liye)
const PUBLIC_URL = "https://pub-xxxxxx.r2.dev"; 

// ==========================================
// CORE FUNCTIONS
// ==========================================

export const uploadFile = async (file, folder, customFileName) => {
    try {
        const ext = file.name.split('.').pop();
        const fileKey = `${folder}/${customFileName}.${ext}`;
        
        const response = await fetch(`${WORKER_URL}/${fileKey}`, {
            method: 'PUT',
            headers: {
                'Content-Type': file.type,
            },
            body: file
        });

        if (!response.ok) throw new Error('Upload failed');
        
        return `${PUBLIC_URL}/${fileKey}`; // DB me save karne ke liye public URL
    } catch (error) {
        console.error("Upload Error:", error);
        return null;
    }
};

export const deleteFile = async (fileKey) => {
    try {
        const response = await fetch(`${WORKER_URL}/${fileKey}`, {
            method: 'DELETE'
        });

        return response.ok;
    } catch (error) {
        console.error("Delete Error:", error);
        return false;
    }
};

// ==========================================
// USE-CASE SPECIFIC FUNCTIONS
// ==========================================

// 1. Profile Picture (Upload & Auto-Replace)
export const uploadPfp = async (userId, file) => {
    return await uploadFile(file, 'profiles', userId);
};

// 2. Profile Picture (Delete)
export const deletePfp = async (userId, ext = 'jpg') => {
    return await deleteFile(`profiles/${userId}.${ext}`);
};

// 3. Product Image (Upload)
export const uploadProductImg = async (productId, file) => {
    const fileName = `${productId}_${Date.now()}`;
    return await uploadFile(file, 'products', fileName);
};

// 4. Product Image (Delete)
export const deleteProductImg = async (fileUrl) => {
    const key = fileUrl.replace(`${PUBLIC_URL}/`, '');
    return await deleteFile(key);
};