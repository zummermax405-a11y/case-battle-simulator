// Конфиг
const WORKER = 'https://mute-night-5909.zummer-max405.workers.dev';
const SB_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SB_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

// Состояние
let state = { user: null, balance: 0, inventory: [], casesOpened: 0 };
let cases = [], skins = [], selectedCase = null;

// Инициализация
async function init() {
    checkAuth();
    loadData();
    if (state.user) loadPlayer();
}

// Авторизация
async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        state.user = data.session.user;
        document.getElementById('auth-btn').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'block';
        document.getElementById('user-email').textContent = state.user.email;
        
        // Синхронизируем с users таблицей
        const { error } = await supabase.from('users').upsert([{
            id: state.user.id,
            email: state.user.email,
            balance: 10000,
            role: 'user'
        }], { onConflict: 'id' });
        
        // Проверяем админа
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', state.user.id)
            .single();
        
        if (userData?.role === 'admin') {
            document.getElementById('admin-btn').style.display = 'block';
        }
    }
    updateUI();
}

function showAuth() {
    document.getElementById('auth-modal').style.display = 'block';
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Ошибка: ' + error.message);
    else location.reload();
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    alert(error ? 'Ошибка' : 'Проверьте email');
}

async function logout() {
    await supabase.auth.signOut();
    location.reload();
}

// Загрузка данных
async function loadData() {
    const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from('cases').select('*'),
        supabase.from('skins').select('*')
    ]);
    cases = c || []; skins = s || [];
    renderCases();
}

async function loadPlayer() {
    if (!state.user) return;
    const { data } = await supabase
        .from('users')
        .select('balance')
        .eq('id', state.user.id)
        .single();
    if (data) state.balance = data.balance;
    
    const { data: inv } = await supabase
        .from('player_inventory')
        .select('skin_id')
        .eq('player_id', state.user.id);
    state.inventory = inv || [];
    
    updateUI();
    renderInventory();
}

// UI
function updateUI() {
    document.getElementById('balance').textContent = state.balance;
    document.getElementById('inventory').textContent = state.inventory.length;
}

function renderCases() {
    document.getElementById('cases').innerHTML = cases.map(c => `
        <div class="case" onclick="previewCase(${c.id})">
            <h3>${c.emoji || '📦'} ${c.name}</h3>
            <p>${c.price} монет</p>
        </div>
    `).join('');
}

function renderInventory() {
    document.getElementById('inventory-list').innerHTML = state.inventory.map(i => `
        <div class="skin">Скин #${i.skin_id}</div>
    `).join('');
}

// Кейсы
function previewCase(id) {
    selectedCase = cases.find(c => c.id === id);
    if (!state.user) {
        alert('Войдите для открытия кейсов');
        showAuth();
        return;
    }
    document.getElementById('preview-title').textContent = selectedCase.name;
    document.getElementById('preview-price').textContent = `Цена: ${selectedCase.price} монет`;
    document.getElementById('preview-modal').style.display = 'block';
}

async function openCase() {
    if (state.balance < selectedCase.price) {
        alert('Недостаточно средств');
        return;
    }
    
    const response = await fetch(WORKER + '/api/open-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            player_id: state.user.id,
            case_id: selectedCase.id,
            case_price: selectedCase.price
        })
    });
    
    const result = await response.json();
    if (result.success) {
        state.balance = result.newBalance;
        state.casesOpened++;
        updateUI();
        alert('Выиграли: ' + (result.skin || 'скин'));
        loadPlayer();
    }
}

// Вывод
function showWithdraw() {
    if (!state.user) {
        alert('Войдите для вывода');
        showAuth();
        return;
    }
    if (state.balance < 1000) {
        alert('Минимум 1000 монет');
        return;
    }
    document.getElementById('withdraw-balance').textContent = state.balance;
    document.getElementById('withdraw-modal').style.display = 'block';
}

async function createWithdraw() {
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const telegram = document.getElementById('withdraw-tg').value;
    
    if (amount < 1000 || amount > state.balance || !telegram) {
        alert('Некорректные данные');
        return;
    }
    
    await supabase.from('withdrawal_requests').insert([{
        player_id: state.user.id,
        amount: amount,
        telegram_contact: telegram,
        status: 'pending'
    }]);
    
    alert('Заявка создана! Админ: @zummer_pro');
    document.getElementById('withdraw-modal').style.display = 'none';
}

// Админ
async function adminPanel() {
    document.getElementById('admin-modal').style.display = 'block';
    
    // Загружаем заявки
    const { data } = await supabase
        .from('withdrawal_requests')
        .select('*')
        .order('id', { ascending: false });
    
    document.getElementById('withdraw-list').innerHTML = (data || []).map(r => `
        <div class="request-item">
            #${r.id} - ${r.amount} монет<br>
            ${r.telegram_contact}<br>
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
    await supabase
        .from('withdrawal_requests')
        .update({ status: 'approved' })
        .eq('id', id);
    adminPanel();
}

async function rejectRequest(id) {
    if (!confirm('Отклонить?')) return;
    await supabase
        .from('withdrawal_requests')
        .update({ status: 'rejected' })
        .eq('id', id);
    adminPanel();
}

async function createNewCase() {
    const name = document.getElementById('case-name').value;
    const price = document.getElementById('case-price').value;
    
    await supabase.from('cases').insert([{ name, price, emoji: '📦' }]);
    alert('Кейс создан');
    loadData();
}

// Запуск
document.addEventListener('DOMContentLoaded', init);