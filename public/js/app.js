// Main App Component

document.addEventListener('DOMContentLoaded', () => {
    const productGrid = document.querySelector('.product-grid');
    const filterBtns = document.querySelectorAll('.filter-btn');

    // Only fetch products if we are on a page with a product grid
    if (productGrid) {
        fetchProducts();

        // Filter Logic
        const allCategoryElements = [...filterBtns, ...document.querySelectorAll('.category-img')];

        allCategoryElements.forEach(el => {
            el.addEventListener('click', () => {
                const category = el.dataset.category;

                // Update active state on buttons
                filterBtns.forEach(b => {
                    if (b.dataset.category === category) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });

                fetchProducts(category);

                // Smooth scroll to product grid if clicking category image
                if (el.classList.contains('category-img')) {
                    document.querySelector('.products-section').scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    // Check Auth Status (Simple token check)
    updateAuthUI();
});

async function fetchProducts(category = 'all') {
    const productGrid = document.querySelector('.product-grid');
    if (!productGrid) return;

    productGrid.innerHTML = '<p class="loading">Loading collections...</p>';

    try {
        let url = '/api/products';
        if (category !== 'all') {
            url += `?category=${category}`;
        }

        const res = await fetch(url);
        const products = await res.json();

        renderProducts(products);
    } catch (err) {
        console.error('Error fetching products:', err);
        productGrid.innerHTML = '<p class="error">Unable to load collections at this time.</p>';
    }
}

function renderProducts(products) {
    const productGrid = document.querySelector('.product-grid');
    productGrid.innerHTML = '';

    if (products.length === 0) {
        productGrid.innerHTML = '<p class="no-products">No pieces found in this collection.</p>';
        return;
    }

    products.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.dataset.productId = product._id;
        card.innerHTML = `
            <img src="${product.imagePath || 'https://placehold.co/400x500?text=No+Image'}" alt="${product.name}" class="product-img">
            <div class="product-info">
                <div class="product-category">${product.category}</div>
                <h3 class="product-name">${product.name}</h3>
                <p class="product-price">PKR ${product.price.toLocaleString()}</p>
                <div class="product-stock ${product.inStock ? 'in-stock' : 'out-of-stock'}">
                    ${product.inStock ? 'In Stock' : 'Out of Stock'}
                </div>
            </div>
        `;

        // Add click handler to navigate to product detail
        card.addEventListener('click', () => {
            window.location.href = `/product.html?id=${product._id}`;
        });

        productGrid.appendChild(card);
    });
}

function updateAuthUI() {
    const headerContent = document.querySelector('.header-content');
    if (!headerContent) return;

    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Remove existing auth buttons if any to avoid dupes
    const existingAuth = document.querySelector('.auth-nav');
    if (existingAuth) existingAuth.remove();

    const authContainer = document.createElement('div');
    authContainer.className = 'auth-nav';

    if (token) {
        // Logged In
        if (user.isAdmin) {
            authContainer.innerHTML = `
                <span class="user-greeting">Hi, ${user.username}</span>
                <a href="/admin.html">Dashboard</a>
                <a href="#" id="logoutBtn">Logout</a>
            `;
        } else {
            authContainer.innerHTML = `
                <span class="user-greeting">Hi, ${user.username}</span>
                <a href="#" id="logoutBtn">Logout</a>
            `;
        }
    } else {
        // Guest
        authContainer.innerHTML = `
            <a href="/login.html">Sign In</a>
            <a href="/signup.html">Join</a>
        `;
    }

    // Append to header content
    headerContent.appendChild(authContainer);

    // Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/index.html';
        });
    }
}
