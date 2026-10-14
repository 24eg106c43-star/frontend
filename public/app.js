// ---- login session ----
const token = localStorage.getItem('token');
const session = JSON.parse(localStorage.getItem('session') || 'null');
if (!token || !session) location.href = 'login.html';
function logout() { localStorage.clear(); location.href = 'login.html'; }
const low = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));
const $ = id => document.getElementById(id);
function toast(m) { const t = $('toast'); t.textContent = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 3000); }

function getApiEndpoint(url) {
  let base = (window.API_BASE_URL || localStorage.getItem('backend_url') || '').trim().replace(/\/+$/, '');
  if (base.endsWith('/api')) {
    base = base.substring(0, base.length - 4);
  }
  let path = url.startsWith('/') ? url : ('/' + url);
  if (!path.startsWith('/api')) {
    path = '/api' + path;
  }
  return base ? (base + path) : path;
}

function hasBackendUrl() {
  const base = (window.API_BASE_URL || localStorage.getItem('backend_url') || '').trim();
  return Boolean(base);
}

function configureBackend() {
  const modal = $('backendModal');
  const cur = localStorage.getItem('backend_url') || window.API_BASE_URL || '';
  if (modal && typeof modal.showModal === 'function') {
    $('modalBackendUrl').value = cur;
    $('modalStatus').textContent = '';
    modal.showModal();
  } else {
    const url = prompt(
      "Your frontend is running as a Static Site and needs your Spring Boot Backend URL.\n\n" +
      "Enter your Backend Render URL (e.g. https://your-backend.onrender.com):",
      cur
    );
    if (url !== null) {
      if (url.trim()) {
        localStorage.setItem('backend_url', url.trim().replace(/\/+$/, ''));
        toast('Backend URL saved. Reloading...');
      } else {
        localStorage.removeItem('backend_url');
        toast('Backend URL cleared. Reloading...');
      }
      setTimeout(() => location.reload(), 300);
    }
  }
}

async function testBackendConnection() {
  const input = $('modalBackendUrl');
  const statusEl = $('modalStatus');
  let url = (input.value || '').trim().replace(/\/+$/, '');
  if (!url) {
    statusEl.style.color = '#c62828';
    statusEl.textContent = 'Please enter a URL first.';
    return;
  }
  if (url.endsWith('/api')) {
    url = url.substring(0, url.length - 4);
  }
  statusEl.style.color = '#0277bd';
  statusEl.textContent = '⏳ Testing connection to ' + url + '/api ...';

  try {
    const res = await fetch(url + '/api', { method: 'GET' });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      statusEl.style.color = '#2e7d32';
      statusEl.textContent = '✅ Connected successfully! (API status: ' + (data.status || 'UP') + ')';
    } else {
      statusEl.style.color = '#c62828';
      statusEl.textContent = '⚠️ Server responded with HTTP ' + res.status + '.';
    }
  } catch (err) {
    statusEl.style.color = '#c62828';
    statusEl.textContent = '❌ Failed to reach backend: ' + err.message;
  }
}

function saveBackendConnection() {
  const input = $('modalBackendUrl');
  const val = (input.value || '').trim().replace(/\/+$/, '');
  if (val) {
    localStorage.setItem('backend_url', val);
    toast('Backend URL saved. Reloading...');
  } else {
    localStorage.removeItem('backend_url');
    toast('Backend URL cleared. Reloading...');
  }
  const modal = $('backendModal');
  if (modal) modal.close();
  setTimeout(() => location.reload(), 300);
}

// Show banner if hosted and backend URL is not set
if (!hasBackendUrl() && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  const b = $('backendBanner');
  if (b) b.style.display = 'block';
}

async function api(url, method = 'GET', body) {
  try {
    const fullUrl = getApiEndpoint(url);
    const r = await fetch(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: body ? JSON.stringify(body) : undefined
    });

    if (r.status === 401) {
      logout();
      throw new Error('Please login again');
    }
    if (r.status === 404) {
      const b = $('backendBanner');
      if (b) b.style.display = 'block';
      toast('API 404: Endpoint not found. Check Backend URL.');
      throw new Error('API 404: Endpoint not found');
    }

    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || 'Request failed (' + r.status + ')');
    return Array.isArray(d) ? d.map(low) : d;
  } catch (err) {
    if (!err.message.includes('Please login')) {
      toast(err.message || 'Cannot reach API server');
    }
    throw err;
  }
}

const val = id => $(id).value.trim();

document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('main section').forEach(s => s.hidden = s.id !== b.dataset.tab);
});

async function loadProducts() {
  try {
    const list = await api('/products?q=' + encodeURIComponent(val('q')));
    $('products').innerHTML = (list && list.length) ? list.map(p => `
      <div class="card">
        <h3>${p.crop_name} <span class="tag">${p.quality || '-'}</span></h3>
        <div class="price">₹${p.price}/kg</div>
        <p class="muted">${p.category || ''} · ${p.quantity} kg left<br>Farmer: ${p.farmer_name || ('#' + p.farmer_id)} (${p.location || ''})<br>Harvest: ${p.harvest_date || '-'}</p>
        <input id="qty${p.product_id}" type="number" min="1" value="1" style="width:80px">
        <button onclick="placeOrder(${p.product_id})">Order</button>
      </div>`).join('') : '<p class="muted" style="grid-column:1/-1;text-align:center;padding:20px;">No products found.</p>';
  } catch (err) {
    $('products').innerHTML = `
      <div class="card" style="text-align:center;padding:32px 16px;grid-column:1/-1;">
        <div style="font-size:32px;margin-bottom:12px;">🔌</div>
        <h3 style="margin-bottom:8px;">Backend Connection Needed</h3>
        <p class="muted" style="max-width:500px;margin:8px auto 16px;font-size:14px;line-height:1.4;">
          Products could not be loaded (${err.message || 'Error'}). Your static site needs the URL of your deployed Render backend web service.
        </p>
        <button onclick="configureBackend()" style="background:#2e7d32;color:white;padding:10px 20px;border-radius:6px;border:none;cursor:pointer;font-weight:600;font-size:14px;">
          ⚙️ Connect Backend URL
        </button>
      </div>`;
  }
}

async function placeOrder(pid) {
  try {
    const r = await api('/orders', 'POST', { customerId: val('custId'), productId: pid, quantity: $('qty' + pid).value });
    toast(`Order #${r.orderId} placed. Total ₹${r.total}`);
    loadProducts();
  } catch (e) {
    toast(e.message);
  }
}

async function registerCustomer() {
  const r = await api('/customers', 'POST', { name: val('cName'), phone: val('cPhone'), address: val('cAddr') });
  $('custId').value = r.id;
  toast('Registered! Your customer ID is ' + r.id);
}

async function registerFarmer() {
  const r = await api('/farmers', 'POST', { name: val('fName'), phone: val('fPhone'), location: val('fLoc') });
  $('pFarmer').value = r.id;
  toast('Registered! Your farmer ID is ' + r.id);
}

async function suggestPrice() {
  try {
    const r = await api('/price-suggestion?crop=' + encodeURIComponent(val('pCrop')));
    if (r.recommendedPrice == null) {
      $('suggest').textContent = 'Not enough market data for this crop.';
      return;
    }
    $('pPrice').value = r.recommendedPrice;
    $('suggest').textContent = `Recommended price: ₹${r.recommendedPrice}/kg (linear regression on market history)`;
  } catch (e) {
    $('suggest').textContent = 'Error fetching price suggestion.';
  }
}

async function addProduct() {
  try {
    await api('/products', 'POST', {
      farmerId: val('pFarmer'),
      cropName: val('pCrop'),
      category: val('pCat'),
      quantity: val('pQty'),
      price: val('pPrice'),
      quality: val('pQual'),
      harvestDate: val('pDate') || new Date().toISOString().slice(0, 10)
    });
    toast('Crop added');
    loadProducts();
  } catch (e) {
    toast('Check farmer ID and fields: ' + e.message);
  }
}

async function loadOrders() {
  const role = val('role'), id = val('oId');
  const q = role === 'farmer' ? 'farmerId=' + id : 'customerId=' + id;
  try {
    const d = await api(`/dashboard/${role}/${id}`);
    $('dash').textContent = d.dashboard || '';
  } catch {
    $('dash').textContent = 'Dashboard unavailable';
  }
  try {
    const list = await api('/orders?' + q);
    $('orderList').innerHTML = (list && list.length) ? list.map(o => `<div class="card row"><b>#${o.order_id}</b> ${o.crop_name} · ${o.quantity} kg · ₹${o.total_amount}
      <span class="tag">${o.order_status}</span>` + (role === 'farmer' ? ['CONFIRMED', 'SHIPPED', 'DELIVERED'].map(s =>
      `<button onclick="setStatus(${o.order_id},'${s}')">${s}</button>`).join('') : '') + '</div>').join('') : '<p class="muted">No orders.</p>';
  } catch (e) {
    $('orderList').innerHTML = '<p class="muted">Could not load orders.</p>';
  }
}

async function setStatus(id, s) {
  try {
    await api(`/orders/${id}/status?status=${s}`, 'PUT');
    loadOrders();
  } catch (e) {
    toast('Failed to update status');
  }
}

async function loadAdmin() {
  try {
    const d = await api('/dashboard/admin/0');
    $('adminOut').textContent = d.dashboard || '';
  } catch (e) {
    $('adminOut').textContent = 'Admin summary unavailable.';
  }
}

loadProducts();

// ---- role-based setup ----
$('who').textContent = session.name + ' (' + session.role + ')';
if (session.role !== 'admin') {
  const tab = document.querySelector('[data-tab=admin]');
  if (tab) tab.remove();
  if ($('admin')) $('admin').remove();
}
if (session.role === 'customer') {
  const tab = document.querySelector('[data-tab=farmer]');
  if (tab) tab.remove();
  if ($('farmer')) $('farmer').remove();
  $('custId').value = session.profileId;
  $('role').value = 'customer';
  $('oId').value = session.profileId;
}
if (session.role === 'farmer') {
  $('pFarmer').value = session.profileId;
  $('role').value = 'farmer';
  $('oId').value = session.profileId;
}
if (session.role !== 'admin') {
  $('custId').readOnly = true;
  $('oId').readOnly = true;
  $('role').disabled = true;
}
