// Конфиг
const WORKER = 'https://mute-night-5909.zummer-max405.workers.dev';
const SB_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dHNnaXprdXlpcG9sY252YW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0MzM4MzQsImV4cCI6MjA1NDAwOTgzNH0.3azU2-uZ5YFzrhXZSmQOsl9n3oQN8yVJjRfCmG-3F9Y';
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

// Состояние
let state = { user: null, balance: 0, inventory: [] };
let cases = [], skins = [], selectedCase = null;

// Инициализация
async function init() {
    console.log('Инициализация...');
    await checkAuth();
    await loadData();
    if (state.user) await loadPlayer();
    setupModalListeners();
    updateUI();
}

// Модалки
function setupModalListeners() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
    });
}
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

// Авторизация
async function checkAuth() {
    try {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
            state.user = data.session.user;
            document.getElementById('auth-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'block';
            document.getElementById('user-email').textContent = state.user.email;
            
            await supabase.from('users').upsert({
                id: state.user.id, email: state.user.email, balance: 10000, role: 'user'
            }, { onConflict: 'id' });
            
            const { data: userData } = await supabase.from('users').select('role').eq('id', state.user.id).single();
            if (userData?.role === 'admin') document.getElementById('admin-btn').style.display = 'block';
        } else {
            document.getElementById('auth-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('admin-btn').style.display = 'none';
            document.getElementById('user-email').textContent = 'Гость';
        }
    } catch (e) { console.error('Ошибка auth:', e); }
}
function showAuth() { document.getElementById('auth-modal').style.display = 'block'; }
async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) return alert('Заполните все поля');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Ошибка: ' + error.message); else { closeModal('auth-modal'); location.reload(); }
}
async function register() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    if (!email || !password) return alert('Заполните все поля');
    if (password.length < 6) return alert('Пароль от 6 символов');
    const { error } = await supabase.auth.signUp({ email, password });
    alert(error ? 'Ошибка: ' + error.message : 'Проверьте email');
    if (!error) closeModal('auth-modal');
}
async function logout() { await supabase.auth.signOut(); location.reload(); }

// Загрузка данных
async function loadData() {
    try {
        const [{ data: c }, { data: s }] = await Promise.all([
            supabase.from('cases').select('*'),
            supabase.from('skins').select('*')
        ]);
        cases = c || []; skins = s || [];
        renderCases();
    } catch (e) { console.error('Ошибка загрузки:', e); }
}
async function loadPlayer() {
    if (!state.user) return;
    const { data } = await supabase.from('users').select('balance').eq('id', state.user.id).single();
    if (data) state.balance = data.balance;
    const { data: inv } = await supabase.from('player_inventory').select('skin_id').eq('player_id', state.user.id);
    state.inventory = inv || [];
    updateUI(); renderInventory();
}

// UI
function updateUI() {
    const balanceEl = document.getElementById('balance');
    const inventoryEl = document.getElementById('inventory');
    const withdrawBalanceEl = document.getElementById('withdraw-balance');
    if (balanceEl) balanceEl.textContent = state.balance;
    if (inventoryEl) inventoryEl.textContent = state.inventory.length;
    if (withdrawBalanceEl) withdrawBalanceEl.textContent = state.balance;
}
function renderCases() {
    const container = document.getElementById('cases');
    if (!container) return;
    if (!cases.length) { container.innerHTML = '<p>Кейсы отсутствуют</p>'; return; }
    container.innerHTML = cases.map(c => `
        <div class="case" onclick="previewCase(${c.id})">
            <h3>${c.emoji || '📦'} ${c.name}</h3>
            <p>${c.price} монет</p>
        </div>
    `).join('');
}
function renderInventory() {
    const container = document.getElementById('inventory-list');
    if (!container) return;
    if (!state.inventory.length) { container.innerHTML = '<p>Инвентарь пуст</p>'; return; }
    container.innerHTML = state.inventory.map(i => {
        const skin = skins.find(s => s.id === i.skin_id);
        return `<div class="skin">${skin?.name || 'Скин'} #${i.skin_id}</div>`;
    }).join('');
}

// Кейсы
function previewCase(id) {
    selectedCase = cases.find(c => c.id === id);
    if (!state.user) { alert('Войдите для открытия'); showAuth(); return; }
    document.getElementById('preview-title').textContent = selectedCase.name;
    document.getElementById('preview-price').textContent = `Цена: ${selectedCase.price} монет`;
    document.getElementById('preview-modal').style.display = 'block';
}
async function openCase() {
    if (!selectedCase || !state.user) return alert('Ошибка');
    if (state.balance < selectedCase.price) { alert('Недостаточно средств'); closeModal('preview-modal'); return; }
    try {
        const response = await fetch(WORKER + '/api/open-case', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ player_id: state.user.id, case_id: selectedCase.id, case_price: selectedCase.price })
        });
        const result = await response.json();
        if (result.success) {
            state.balance = result.newBalance;
            updateUI(); alert('Выиграли: ' + (result.skin || 'скин'));
            closeModal('preview-modal'); await loadPlayer();
        } else alert('Ошибка: ' + (result.error || 'неизвестно'));
    } catch (e) { alert('Ошибка соединения'); }
}

// Вывод
function showWithdraw() {
    if (!state.user) { alert('Войдите для вывода'); showAuth(); return; }
    if (state.balance < 1000) { alert('Минимум 1000 монет'); return; }
    document.getElementById('withdraw-modal').style.display = 'block';
}
async function createWithdraw() {
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const telegram = document.getElementById('withdraw-tg').value.trim();
    if (amount < 1000 || amount > state.balance || !telegram) return alert('Некорректные данные');
    await supabase.from('withdrawal_requests').insert([{
        player_id: state.user.id, amount, telegram_contact: telegram, status: 'pending'
    }]);
    alert('Заявка создана!'); closeModal('withdraw-modal');
}

// Админ
async function adminPanel() {
    if (!state.user) return;
    document.getElementById('admin-modal').style.display = 'block';
    const { data: userData } = await supabase.from('users').select('role').eq('id', state.user.id).single();
    if (userData?.role !== 'admin') { document.getElementById('admin-content').innerHTML = '<p>Нет прав</p>'; return; }
    const { data } = await supabase.from('withdrawal_requests').select('*').order('id', { ascending: false });
    document.getElementById('withdraw-list').innerHTML = (data || []).map(r => `
        <div class="request-item">
            #${r.id} - ${r.amount} монет<br>${r.telegram_contact}<br>
            Статус: <span class="status-${r.status}">${r.status}</span>
            ${r.status === 'pending' ? `
                <button onclick="approveRequest(${r.id})">✅</button>
                <button onclick="rejectRequest(${r.id})">❌</button>
            ` : ''}
        </div>
    `).join('');
}
async function approveRequest(id) {
    if (!confirm('Одобрить?')) return;
    await supabase.from('withdrawal_requests').update({ status: 'approved' }).eq('id', id);
    adminPanel();
}
async function rejectRequest(id) {
    if (!confirm('Отклонить?')) return;
    await supabase.from('withdrawal_requests').update({ status: 'rejected' }).eq('id', id);
    adminPanel();
}
async function createNewCase() {
    const name = document.getElementById('case-name').value.trim();
    const price = document.getElementById('case-price').value;
    if (!name || !price) return alert('Заполните поля');
    await supabase.from('cases').insert([{ name, price, emoji: '📦' }]);
    alert('Кейс создан'); await loadData();
}

// Запуск
document.addEventListener('DOMContentLoaded', init);