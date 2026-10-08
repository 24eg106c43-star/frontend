// ---- login session ----
const token = localStorage.getItem('token');
const session = JSON.parse(localStorage.getItem('session') || 'null');
if (!token || !session) location.href = 'login.html';
function logout() { localStorage.clear(); location.href = 'login.html'; }
const low = o => Object.fromEntries(Object.entries(o).map(([k, v]) => [k.toLowerCase(), v]));
const $ = id => document.getElementById(id);
function toast(m) { const t = $('toast'); t.textContent = m; t.style.display = 'block'; setTimeout(() => t.style.display = 'none', 2800); }
async function api(url, method = 'GET', body) {
  const r = await fetch('/api' + url, { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token }, body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { logout(); throw new Error('Please login again'); }
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || 'Request failed');
  return Array.isArray(d) ? d.map(low) : d;
}
const val = id => $(id).value.trim();

document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
  document.querySelectorAll('nav button').forEach(x => x.classList.toggle('active', x === b));
  document.querySelectorAll('main section').forEach(s => s.hidden = s.id !== b.dataset.tab);
});

async function loadProducts() {
  const list = await api('/products?q=' + encodeURIComponent(val('q')));
  $('products').innerHTML = list.map(p => `
    <div class="card"><h3>${p.crop_name} <span class="tag">${p.quality || '-'}</span></h3>
      <div class="price">₹${p.price}/kg</div>
      <p class="muted">${p.category || ''} · ${p.quantity} kg left<br>Farmer: ${p.farmer_name} (${p.location || ''})<br>Harvest: ${p.harvest_date || '-'}</p>
      <input id="qty${p.product_id}" type="number" min="1" value="1" style="width:80px">
      <button onclick="placeOrder(${p.product_id})">Order</button></div>`).join('') || '<p class="muted">No products found.</p>';
}
async function placeOrder(pid) {
  try {
    const r = await api('/orders', 'POST', { customerId: val('custId'), productId: pid, quantity: $('qty' + pid).value });
    toast(`Order #${r.orderId} placed. Total ₹${r.total}`); loadProducts();
  } catch (e) { toast(e.message); }
}
async function registerCustomer() {
  const r = await api('/customers', 'POST', { name: val('cName'), phone: val('cPhone'), address: val('cAddr') });
  $('custId').value = r.id; toast('Registered! Your customer ID is ' + r.id);
}
async function registerFarmer() {
  const r = await api('/farmers', 'POST', { name: val('fName'), phone: val('fPhone'), location: val('fLoc') });
  $('pFarmer').value = r.id; toast('Registered! Your farmer ID is ' + r.id);
}
async function suggestPrice() {
  const r = await api('/price-suggestion?crop=' + encodeURIComponent(val('pCrop')));
  if (r.recommendedPrice == null) { $('suggest').textContent = 'Not enough market data for this crop.'; return; }
  $('pPrice').value = r.recommendedPrice;
  $('suggest').textContent = `Recommended price: ₹${r.recommendedPrice}/kg (linear regression on market history)`;
}
async function addProduct() {
  try {
    await api('/products', 'POST', { farmerId: val('pFarmer'), cropName: val('pCrop'), category: val('pCat'), quantity: val('pQty'),
      price: val('pPrice'), quality: val('pQual'), harvestDate: val('pDate') || new Date().toISOString().slice(0, 10) });
    toast('Crop added'); loadProducts();
  } catch (e) { toast('Check farmer ID and fields'); }
}
async function loadOrders() {
  const role = val('role'), id = val('oId');
  const q = role === 'farmer' ? 'farmerId=' + id : 'customerId=' + id;
  try { $('dash').textContent = (await api(`/dashboard/${role}/${id}`)).dashboard; } catch { $('dash').textContent = 'Unknown ID'; }
  const list = await api('/orders?' + q);
  $('orderList').innerHTML = list.map(o => `<div class="card row"><b>#${o.order_id}</b> ${o.crop_name} · ${o.quantity} kg · ₹${o.total_amount}
    <span class="tag">${o.order_status}</span>` + (role === 'farmer' ? ['CONFIRMED', 'SHIPPED', 'DELIVERED'].map(s =>
    `<button onclick="setStatus(${o.order_id},'${s}')">${s}</button>`).join('') : '') + '</div>').join('') || '<p class="muted">No orders.</p>';
}
async function setStatus(id, s) { await api(`/orders/${id}/status?status=${s}`, 'PUT'); loadOrders(); }
async function loadAdmin() { $('adminOut').textContent = (await api('/dashboard/admin/0')).dashboard; }
loadProducts();

// ---- role-based setup ----
$('who').textContent = session.name + ' (' + session.role + ')';
if (session.role !== 'admin') { document.querySelector('[data-tab=admin]').remove(); $('admin').remove(); }
if (session.role === 'customer') { document.querySelector('[data-tab=farmer]').remove(); $('farmer').remove(); $('custId').value = session.profileId; $('role').value = 'customer'; $('oId').value = session.profileId; }
if (session.role === 'farmer') { $('pFarmer').value = session.profileId; $('role').value = 'farmer'; $('oId').value = session.profileId; }
if (session.role !== 'admin') { $('custId').readOnly = true; $('oId').readOnly = true; $('role').disabled = true; }
