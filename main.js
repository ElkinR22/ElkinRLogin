// public/main.js
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res;
}

const loginForm = document.getElementById('loginForm');
const feedback = document.getElementById('feedback');
const dashboard = document.getElementById('dashboard');
const userNameDisplay = document.getElementById('userNameDisplay');
const messagesEl = document.getElementById('messages');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const logoutBtn = document.getElementById('logoutBtn');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  feedback.textContent = '';
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;
  const res = await postJSON('/api/login', { username, password });
  if (res.ok) {
    const data = await res.json();
    showDashboard(data.user);
  } else {
    const err = await res.json();
    feedback.textContent = err.error || 'Error';
    feedback.style.color = '#ff6b6b';
  }
});

async function showDashboard(user){
  loginForm.style.display = 'none';
  dashboard.hidden = false;
  userNameDisplay.textContent = user;
  await loadMessages();
}

logoutBtn.addEventListener('click', async () => {
  await postJSON('/api/logout', {});
  location.reload();
});

chatForm && chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if(!text) return;
  await postJSON('/api/messages', { text });
  chatInput.value = '';
  await loadMessages();
});

async function loadMessages(){
  const res = await fetch('/api/messages', { credentials:'include' });
  if(!res.ok) return;
  const data = await res.json();
  messagesEl.innerHTML = '';
  data.messages.forEach(m => {
    const div = document.createElement('div');
    div.className = 'msg ' + (m.user === document.getElementById('username').value ? 'me' : '');
    div.innerHTML = `<div><strong>${m.user}</strong><div style="font-size:0.85rem">${m.text}</div></div>`;
    messagesEl.appendChild(div);
  });
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// On load try to check session
(async () => {
  const res = await fetch('/api/me', { credentials: 'include' });
  if(res.ok){
    const data = await res.json();
    showDashboard(data.user.username);
  }
})();
