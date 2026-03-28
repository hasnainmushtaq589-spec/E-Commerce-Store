// Admin Dashboard Logic

document.addEventListener('DOMContentLoaded', () => {
    fetchStats();
    fetchProducts();
    fetchOrders();
    setupTabs();

    const addForm = document.getElementById('addProductForm');
    if (addForm) {
        addForm.addEventListener('submit', handleAddProduct);
    }

    const editForm = document.getElementById('editProductForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditProduct);
    }

    // Modal close
    document.getElementById('closeModal')?.addEventListener('click', closeModal);
    document.getElementById('editModal')?.addEventListener('click', (e) => {
        if (e.target.id === 'editModal') closeModal();
    });
});

// Tab functionality
function setupTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
        });
    });
}

async function fetchStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        document.getElementById('salesStat').textContent = data.totalSales.toLocaleString();
        document.getElementById('productsStat').textContent = data.totalProducts;
        document.getElementById('activeStat').textContent = data.activeProducts;
        document.getElementById('ordersStat').textContent = data.totalOrders || 0;
        document.getElementById('pendingStat').textContent = data.pendingOrders || 0;
    } catch (err) {
        console.error('Error fetching stats:', err);
    }
}

async function fetchProducts() {
    try {
        const res = await fetch('/api/products');
        const products = await res.json();
        renderProductsTable(products);
    } catch (err) {
        console.error('Error fetching products:', err);
    }
}

function renderProductsTable(products) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No products found</td></tr>';
        return;
    }

    products.forEach(product => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${product.imagePath || 'https://placehold.co/60x60?text=No+Image'}" alt="${product.name}" class="table-img"></td>
            <td>${product.name}</td>
            <td>${product.category}</td>
            <td>PKR ${product.price.toLocaleString()}</td>
            <td><span class="status-badge ${product.inStock ? 'status-active' : 'status-inactive'}">${product.inStock ? 'In Stock' : 'Out of Stock'}</span></td>
            <td class="action-btns">
                <button class="btn-small btn-edit" onclick="openEditModal('${product._id}')">Edit</button>
                <button class="btn-small btn-delete" onclick="deleteProduct('${product._id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function fetchOrders() {
    try {
        const res = await fetch('/api/orders');
        const orders = await res.json();
        renderOrdersTable(orders);
    } catch (err) {
        console.error('Error fetching orders:', err);
    }
}

function renderOrdersTable(orders) {
    const tbody = document.querySelector('#ordersTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">No orders yet</td></tr>';
        return;
    }

    orders.forEach(order => {
        const customerName = order.customer?.username || order.guestInfo?.name || 'Guest';
        const itemCount = order.items?.length || 0;
        const date = new Date(order.createdAt).toLocaleDateString();

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${order.orderNumber}</td>
            <td>${customerName}</td>
            <td>${itemCount} item(s)</td>
            <td>PKR ${order.totalAmount.toLocaleString()}</td>
            <td><span class="status-badge status-${order.status}">${order.status}</span></td>
            <td>${date}</td>
            <td class="action-btns">
                <select onchange="updateOrderStatus('${order._id}', this.value)" class="status-select">
                    <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                    <option value="confirmed" ${order.status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                    <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                    <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                    <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                    <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function handleAddProduct(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button');

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Adding...';

        const res = await fetch('/api/products', {
            method: 'POST',
            body: formData
        });

        if (res.ok) {
            alert('Product added successfully!');
            form.reset();
            fetchStats();
            fetchProducts();
            // Switch to products tab
            document.querySelector('[data-tab="products"]').click();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to connect to server');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Add Product';
    }
}

// Expose functions to global scope for onclick attributes
window.openEditModal = openEditModal;
window.deleteProduct = deleteProduct;
window.updateOrderStatus = updateOrderStatus;
window.closeModal = closeModal;

async function openEditModal(productId) {
    try {
        const res = await fetch(`/api/products/${productId}`);
        const product = await res.json();

        document.getElementById('editProductId').value = product._id;
        document.getElementById('editName').value = product.name;
        document.getElementById('editCategory').value = product.category;
        document.getElementById('editPrice').value = product.price;
        document.getElementById('editDescription').value = product.description || '';
        document.getElementById('editInStock').value = product.inStock ? 'true' : 'false';

        document.getElementById('editModal').style.display = 'flex';
    } catch (err) {
        console.error('Error loading product:', err);
        alert('Failed to load product details');
    }
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditProduct(e) {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const productId = document.getElementById('editProductId').value;
    const submitBtn = form.querySelector('button');

    try {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Updating...';

        const res = await fetch(`/api/products/${productId}`, {
            method: 'PUT',
            body: formData
        });

        if (res.ok) {
            alert('Product updated successfully!');
            closeModal();
            fetchProducts();
            fetchStats();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to update product');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Update Product';
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const res = await fetch(`/api/products/${productId}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            alert('Product deleted successfully!');
            fetchProducts();
            fetchStats();
        } else {
            const data = await res.json();
            alert('Error: ' + data.error);
        }
    } catch (err) {
        console.error(err);
        alert('Failed to delete product');
    }
}

async function updateOrderStatus(orderId, status) {
    try {
        const res = await fetch(`/api/orders/${orderId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });

        if (res.ok) {
            fetchStats();
        } else {
            alert('Failed to update order status');
        }
    } catch (err) {
        console.error(err);
    }
}
