const defaultProducts = [...document.querySelector("#product-catalog").content.querySelectorAll(".product-card")].map(card => ({
    id: card.dataset.id,
    name: card.querySelector("h3").textContent.trim(),
    description: card.dataset.description,
    category: card.dataset.category,
    price: Number(card.dataset.price),
    image: card.querySelector("img").getAttribute("src"),
    badge: card.dataset.badge
}));

const storage = {
    get(key, fallback) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : fallback;
        } catch {
            return fallback;
        }
    },
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch {
            // The storefront still works if browser storage is disabled.
        }
    }
};

const savedProducts = storage.get("sweet-room-products", null);
const removedProductIds = storage.get("sweet-room-removed-products", []);
const defaultProductIds = new Set(defaultProducts.map(product => product.id));
const savedProductList = Array.isArray(savedProducts) ? savedProducts : [];
let products = defaultProducts
    .filter(product => !removedProductIds.includes(product.id))
    .map(product => {
        const savedProduct = savedProductList.find(saved => saved.id === product.id);
        return { ...savedProduct, ...product };
    });
products.push(...savedProductList.filter(product => !defaultProductIds.has(product.id) && !removedProductIds.includes(product.id)));
storage.set("sweet-room-products", products);
let cart = storage.get("sweet-room-cart", []);
let activeCategory = "Все";

const productGrid = document.querySelector("#product-grid");
const searchInput = document.querySelector("#product-search");
const cartCount = document.querySelector("#cart-count");
const money = amount => `${new Intl.NumberFormat("ru-RU").format(amount)} сом`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[character]);

function renderProducts() {
    const term = (searchInput?.value || "").trim().toLocaleLowerCase("ru");
    const visibleProducts = products.filter(product => {
        const matchesCategory = activeCategory === "Все" || product.category === activeCategory;
        const matchesSearch = `${product.name} ${product.description}`.toLocaleLowerCase("ru").includes(term);
        return matchesCategory && matchesSearch;
    });

    if (!visibleProducts.length) {
        productGrid.innerHTML = '<p class="empty-state">Ничего не нашли. Попробуйте изменить запрос.</p>';
        return;
    }

    productGrid.innerHTML = visibleProducts.map(product => `
        <article class="treat-card product-card">
            <div class="treat-photo">
                ${product.image ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy">` : `<div class="photo-placeholder"><span>＋</span><small>Место для фото</small></div>`}
                ${product.badge ? `<span class="tag">${escapeHtml(product.badge)}</span>` : ""}
            </div>
            <div class="treat-info product-info">
                <div><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || product.category)}</p><strong class="product-price">${money(Number(product.price) || 0)}</strong></div>
                <button class="add-to-cart" type="button" data-add="${escapeHtml(product.id)}" aria-label="Добавить ${escapeHtml(product.name)} в корзину">+</button>
            </div>
        </article>`).join("");
}

function renderCart() {
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalQuantity;
    const cartItems = document.querySelector("#cart-items");
    const selectedProducts = cart.map(item => ({
        ...products.find(product => product.id === item.id),
        quantity: item.quantity
    })).filter(item => item.id);

    if (!selectedProducts.length) {
        cartItems.innerHTML = '<p class="empty-state">Корзина пока пустая. Самое время выбрать что-нибудь сладкое!</p>';
    } else {
        cartItems.innerHTML = selectedProducts.map(product => `
            <div class="cart-row">
                ${product.image ? `<img src="${escapeHtml(product.image)}" alt="" loading="lazy">` : `<div class="cart-photo-placeholder" aria-hidden="true">＋</div>`}
                <div class="cart-row-info"><strong>${escapeHtml(product.name)}</strong><span>${money(product.price)}</span></div>
                <div class="quantity-control"><button type="button" data-quantity="-1" data-id="${escapeHtml(product.id)}" aria-label="Уменьшить">−</button><span>${product.quantity}</span><button type="button" data-quantity="1" data-id="${escapeHtml(product.id)}" aria-label="Увеличить">+</button></div>
            </div>`).join("");
    }

    const total = selectedProducts.reduce((sum, product) => sum + Number(product.price) * product.quantity, 0);
    document.querySelector("#cart-total").textContent = money(total);
    storage.set("sweet-room-cart", cart);
}

productGrid.addEventListener("click", event => {
    const button = event.target.closest("[data-add]");
    if (!button) return;
    const product = products.find(item => item.id === button.dataset.add);
    if (!product) return;
    const cartItem = cart.find(item => item.id === product.id);
    if (cartItem) cartItem.quantity += 1;
    else cart.push({ id: product.id, quantity: 1 });
    renderCart();
    button.classList.add("is-added");
    button.textContent = "✓";
    window.setTimeout(() => {
        if (button.isConnected) {
            button.classList.remove("is-added");
            button.textContent = "+";
        }
    }, 900);
});

document.querySelectorAll(".filter-button").forEach(button => {
    button.addEventListener("click", () => {
        activeCategory = button.dataset.category;
        document.querySelector(".filter-button.is-active")?.classList.remove("is-active");
        button.classList.add("is-active");
        renderProducts();
    });
});
searchInput.addEventListener("input", renderProducts);

const reviewForm = document.querySelector("#review-form");
const reviewsList = document.querySelector("#reviews-list");
let reviews = storage.get("sweet-room-reviews", []);

function renderReviews() {
    if (!reviews.length) {
        reviewsList.innerHTML = '<p class="reviews-empty">Пока нет отзывов. Будьте первыми — расскажите о своих впечатлениях!</p>';
        return;
    }

    reviewsList.innerHTML = reviews.map(review => {
        const rating = Math.max(1, Math.min(5, Number(review.rating) || 5));
        const date = new Date(review.date);
        const dateLabel = Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" });
        return `
            <article class="review-card">
                <div class="review-card-top"><strong>${escapeHtml(review.name)}</strong><time>${escapeHtml(dateLabel)}</time></div>
                <div class="review-stars" aria-label="Оценка ${rating} из 5">${"★".repeat(rating)}<span>${"★".repeat(5 - rating)}</span></div>
                <p>${escapeHtml(review.text)}</p>
            </article>`;
    }).join("");
}

reviewForm.addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    reviews.unshift({
        name: form.elements.name.value.trim(),
        rating: Number(form.elements.rating.value),
        text: form.elements.text.value.trim(),
        date: new Date().toISOString()
    });
    storage.set("sweet-room-reviews", reviews);
    renderReviews();
    form.reset();
    document.querySelector("#review-status").textContent = "Спасибо! Ваш отзыв добавлен.";
});

document.querySelector("#cart-items").addEventListener("click", event => {
    const button = event.target.closest("[data-quantity]");
    if (!button) return;
    const item = cart.find(entry => entry.id === button.dataset.id);
    if (!item) return;
    item.quantity += Number(button.dataset.quantity);
    if (item.quantity <= 0) cart = cart.filter(entry => entry.id !== item.id);
    renderCart();
});

const modalBackdrop = document.querySelectorAll(".modal-backdrop");
document.querySelectorAll("[data-open]").forEach(button => {
    button.addEventListener("click", () => {
        const modal = document.getElementById(button.dataset.open);
        if (!modal) return;
        modal.hidden = false;
        document.body.classList.add("modal-open");
        if (modal.id === "profile-modal") {
            const profile = storage.get("sweet-room-profile", {});
            const form = document.querySelector("#profile-form");
            form.elements.name.value = profile.name || "";
            form.elements.phone.value = profile.phone || "";
        }
    });
});

function closeModal(modal) {
    modal.hidden = true;
    if (![...modalBackdrop].some(item => !item.hidden)) document.body.classList.remove("modal-open");
}

document.querySelectorAll("[data-close]").forEach(button => button.addEventListener("click", () => closeModal(button.closest(".modal-backdrop"))));
modalBackdrop.forEach(modal => modal.addEventListener("click", event => {
    if (event.target === modal) closeModal(modal);
}));
document.addEventListener("keydown", event => {
    if (event.key === "Escape") modalBackdrop.forEach(modal => {
        if (!modal.hidden) closeModal(modal);
    });
});

document.querySelector("#profile-form").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    storage.set("sweet-room-profile", { name: form.elements.name.value.trim(), phone: form.elements.phone.value.trim() });
    document.querySelector("#profile-status").textContent = "Профиль сохранён на этом устройстве.";
});

document.querySelector("#checkout-form").addEventListener("submit", event => {
    event.preventDefault();
    if (!cart.length) {
        window.alert("Сначала добавьте десерт в корзину.");
        return;
    }
    const form = event.currentTarget;
    const orderLines = cart.map(item => {
        const product = products.find(entry => entry.id === item.id);
        return product ? `${product.name} × ${item.quantity} — ${money(product.price * item.quantity)}` : "";
    }).filter(Boolean);
    const total = cart.reduce((sum, item) => {
        const product = products.find(entry => entry.id === item.id);
        return sum + (product ? Number(product.price) * item.quantity : 0);
    }, 0);
    const message = `Здравствуйте! Хочу оформить заказ в SWEET ROOM.\nИмя: ${form.elements.name.value.trim()}\nТелефон: ${form.elements.phone.value.trim()}\n\n${orderLines.join("\n")}\n\nИтого: ${money(total)}`;
    window.open(`https://wa.me/996501166814?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
});

renderProducts();
renderCart();
renderReviews();