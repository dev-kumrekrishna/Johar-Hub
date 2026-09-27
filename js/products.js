import { db }
from "./config.js";

import {
    collection,
    getDocs
}
from
"https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

window.loadProducts =
async function(){

    const container =
        document.getElementById(
            "productsGrid"
        );

    container.innerHTML = "";

    const snapshot =
        await getDocs(
            collection(
                db,
                "products"
            )
        );

    snapshot.forEach(doc=>{

        const p =
            doc.data();

        container.innerHTML += `
        <div class="product-card">

            <img
              src="${p.image}"
            >

            <div
             class="product-card-content"
            >

                <h3>
                    ${p.name}
                </h3>

                <div
                 class="product-price"
                >
                    ₹${p.price}
                </div>

                <button
                  onclick="
                    window.open(
                        '${p.buyLink}'
                    )
                  "
                >
                    Buy Now
                </button>

            </div>

        </div>
        `;
    });
};