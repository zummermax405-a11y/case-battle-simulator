// Конфигурация
const WORKER_URL = 'https://mute-night-5909.zummer-max405.workers.dev';
const SUPABASE_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Состояние
let game = { balance: 0, inventory: [], casesOpened: 0, user: null };
let cases = [], skins = [], selectedCase = null;

// Инициализация
async function init() {
    checkAuth();
    loadData();
    if (game.user) updateGame();
}

// Авторизация
async function checkAuth() {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
        game.user = data.session.user;
        document.getElementById('auth-btn').style.display = 'none';
        document.getElementById('user-email').textContent = game.user.email;
    }
}

function authToggle() {
    document.getElementById('auth-modal').style.display = 'block';
}

async function login() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Ошибка: ' + error.message);
    else location.reload();
}

async function register() {
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const { error } = await supabase.auth.signUp({ email, password });
    alert(error ? 'Ошибка' : 'Проверьте email');
}

// Данные
async function loadData() {
    const [{ data: c }, { data: s }] = await Promise.all([
        supabase.from('cases').select('*'),
        supabase.from('skins').select('*')
    ]);
    cases = c || []; skins = s || [];
    renderCases();
}

// UI
function updateUI() {
    document.getElementById('balance').textContent = game.balance;
    document.getElementById('inventory-count').textContent = game.inventory.length;
    document.getElementById('cases-opened').textContent = game.casesOpened;
}

function renderCases() {
    const container = document.getElementById('cases-container');
    container.innerHTML = cases.map(c => `
        <div class="case-item" onclick="previewCase(${c.id})">
            <h3>${c.emoji} ${c.name}</h3>
            <p>${c.price} монет</p>
        </div>
    `).join('');
}

// Кейсы
function previewCase(id) {
    selectedCase = cases.find(c => c.id === id);
    document.getElementById('preview-title').textContent = selectedCase.name;
    document.getElementById('preview-price').textContent = selectedCase.price;
    document.getElementById('preview-modal').style.display = 'block';
}

async function openCase() {
    if (!game.user || game.balance < selectedCase.price) {
        alert('Недостаточно средств или не авторизован');
        return;
    }
    
    const response = await fetch(WORKER_URL + '/api/open-case', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            player_id: game.user.id,
            case_id: selectedCase.id,
            case_price: selectedCase.price
        })
    });
    
    const result = await response.json();
    if (result.success) {
        game.balance = result.newBalance;
        game.casesOpened++;
        updateUI();
        alert('Выиграно: ' + result.wonSkin);
    }
}

// Вывод
function showWithdraw() {
    if (game.balance < 1000) {
        alert('Минимум 1000 монет');
        return;
    }
    document.getElementById('withdraw-balance').textContent = game.balance;
    document.getElementById('withdraw-modal').style.display = 'block';
}

async function createWithdraw() {
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const telegram = document.getElementById('withdraw-telegram').value;
    
    if (amount < 1000 || amount > game.balance || !telegram) {
        alert('Некорректные данные');
        return;
    }
    
    await fetch(WORKER_URL + '/api/create-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            player_id: game.user.id,
            amount: amount,
            telegram: telegram
        })
    });
    
    alert('Заявка создана! Админ: @zummer_pro');
    document.getElementById('withdraw-modal').style.display = 'none';
}

// Админ
function showAdmin() {
    if (!game.user) return;
    document.getElementById('admin-modal').style.display = 'block';
    loadWithdrawRequests();
}

async function loadWithdrawRequests() {
    const { data } = await supabase.from('withdrawal_requests').select('*');
    const container = document.getElementById('withdraw-requests');
    container.innerHTML = (data || []).map(r => `
        <div>${r.id}: ${r.amount} @${r.telegram} - ${r.status}</div>
    `).join('');
}

async function createCase() {
    const name = document.getElementById('admin-case-name').value;
    const price = document.getElementById('admin-case-price').value;
    
    await supabase.from('cases').insert([{ name, price, emoji: '📦' }]);
    alert('Кейс создан');
    loadData();
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', init);