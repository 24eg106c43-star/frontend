const $ = (id) => document.getElementById(id);
if (localStorage.getItem('token')) location.href = 'index.html';   // already logged in
let mode = 'login';

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
  const body = { email: $('email').value, password: $('password').value };
  if (mode === 'register') Object.assign(body, { name: $('name').value, role: $('role').value, phone: $('phone').value, location: $('loc').value, address: $('loc').value });
  try {
    const r = await fetch('/api/auth/' + mode, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { $('err').textContent = d.error || 'Something went wrong'; return; }
    localStorage.setItem('token', d.token);
    localStorage.setItem('session', JSON.stringify({ name: d.name, role: d.role, profileId: d.profileId }));
    location.href = 'index.html';
  } catch { $('err').textContent = 'Cannot reach the server. Is the backend running?'; }
};
