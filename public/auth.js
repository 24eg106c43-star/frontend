const $ = (id) => document.getElementById(id);
if (localStorage.getItem('token')) location.href = 'index.html';   // already logged in
let mode = 'login';

// Initialize Backend URL settings
const savedUrl = localStorage.getItem('backend_url') || window.API_BASE_URL || '';
if ($('backendUrlInput')) $('backendUrlInput').value = savedUrl;

// If hosted and no backend configured, expand backend settings automatically
if (!savedUrl && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
  if ($('backendSettings')) $('backendSettings').open = true;
}

if ($('testBackendUrlBtn')) {
  $('testBackendUrlBtn').onclick = async () => {
    const resEl = $('backendTestResult');
    let url = ($('backendUrlInput').value || '').trim().replace(/\/+$/, '');
    if (!url) {
      resEl.style.color = '#c62828';
      resEl.textContent = 'Please enter a URL first.';
      return;
    }
    if (url.endsWith('/api')) url = url.substring(0, url.length - 4);
    resEl.style.color = '#0277bd';
    resEl.textContent = 'Testing connection...';
    try {
      const r = await fetch(url + '/api');
      if (r.ok) {
        resEl.style.color = '#2e7d32';
        resEl.textContent = '✅ Connected! Backend is online.';
      } else {
        resEl.style.color = '#c62828';
        resEl.textContent = '⚠️ Responded with HTTP ' + r.status;
      }
    } catch (e) {
      resEl.style.color = '#c62828';
      resEl.textContent = '❌ Failed to reach backend: ' + e.message;
    }
  };
}

if ($('saveBackendUrlBtn')) {
  $('saveBackendUrlBtn').onclick = () => {
    const val = $('backendUrlInput').value.trim();
    if (val) {
      localStorage.setItem('backend_url', val.replace(/\/+$/, ''));
      $('err').style.color = '#2e7d32';
      $('err').textContent = 'Backend URL saved: ' + val;
    } else {
      localStorage.removeItem('backend_url');
      $('err').style.color = '#667';
      $('err').textContent = 'Backend URL reset to default relative /api';
    }
  };
}

function setMode(m) {
  mode = m;
  const reg = m === 'register';
  $('regOnly').hidden = !reg;
  $('tLogin').classList.toggle('on', !reg); $('tReg').classList.toggle('on', reg);
  $('title').textContent = reg ? 'Create account' : 'Welcome back';
  $('sub').textContent = reg ? 'Join Farmer Direct Market' : 'Login to Farmer Direct Market';
  $('submit').textContent = reg ? 'Register' : 'Login';
  $('err').textContent = '';
}
$('tLogin').onclick = () => setMode('login');
$('tReg').onclick = () => setMode('register');
$('role').onchange = () => {
  const farmer = $('role').value === 'farmer';
  $('locLabel').textContent = farmer ? 'Farm location' : 'Address';
  $('loc').placeholder = farmer ? 'Village / district' : 'Delivery address';
};

$('form').onsubmit = async (e) => {
  e.preventDefault();
  $('err').style.color = '#c62828';
  const body = { email: $('email').value, password: $('password').value };
  if (mode === 'register') Object.assign(body, { name: $('name').value, role: $('role').value, phone: $('phone').value, location: $('loc').value, address: $('loc').value });
  try {
    let base = (window.API_BASE_URL || localStorage.getItem('backend_url') || '').trim().replace(/\/+$/, '');
    if (base.endsWith('/api')) {
      base = base.substring(0, base.length - 4);
    }
    const endpoint = base ? (base + '/api/auth/' + mode) : ('/api/auth/' + mode);
    const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (r.status === 404) {
      $('err').innerHTML = 'Backend returned 404 (Not Found).<br>Set your <b>Backend Render URL</b> below:';
      if ($('backendSettings')) $('backendSettings').open = true;
      return;
    }
    if (!r.ok) { $('err').textContent = d.error || 'Something went wrong'; return; }
    localStorage.setItem('token', d.token);
    localStorage.setItem('session', JSON.stringify({ name: d.name, role: d.role, profileId: d.profileId }));
    location.href = 'index.html';
  } catch (err) {
    $('err').innerHTML = 'Cannot reach backend server.<br>Ensure backend is running and Backend URL is configured below:';
    if ($('backendSettings')) $('backendSettings').open = true;
  }
};
