// Конфиг
const SB_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SB_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
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
}

function showAuth() { showLogin(); }
function showLogin() { 
    document.getElementById('login-modal').style.display = 'block'; 
}
function showRegister() { 
    document.getElementById('register-modal').style.display = 'block';
    document.getElementById('login-modal').style.display = 'none';
}
function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
}

// ==================== РЕГИСТРАЦИЯ И ВХОД ====================

async function handleRegister() {
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const confirm = document.getElementById('register-confirm').value.trim();
    const errorEl = document.getElementById('register-error');
    
    errorEl.textContent = '';
    
    if (!email || !password || !confirm) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }
    
    if (password.length < 6) {
        errorEl.textContent = 'Пароль должен быть не менее 6 символов';
        return;
    }
    
    if (password !== confirm) {
        errorEl.textContent = 'Пароли не совпадают';
        return;
    }
    
    try {
        console.log('Регистрируем пользователя...');
        
        // 1. Регистрация в Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    email: email
                }
            }
        });
        
        if (authError) throw authError;
        
        console.log('Auth регистрация успешна:', authData.user?.id);
        
        // 2. Создаем запись в таблице users
        if (authData.user) {
            const { error: dbError } = await supabase
                .from('users')
                .insert([{
                    id: authData.user.id,
                    email: authData.user.email,
                    balance: 10000,
                    role: 'user',
                    created_at: new Date().toISOString()
                }]);
                
            if (dbError) {
                console.error('Ошибка создания записи в users:', dbError);
                // Продолжаем - пользователь может зайти позже
            }
        }
        
        alert('Регистрация успешна! Теперь войдите в аккаунт.');
        closeModal('register-modal');
        showLogin();
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        errorEl.textContent = error.message || 'Ошибка регистрации';
    }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const errorEl = document.getElementById('login-error');
    
    errorEl.textContent = '';
    
    if (!email || !password) {
        errorEl.textContent = 'Заполните все поля';
        return;
    }
    
    try {
        console.log('Входим...');
        
        // 1. Вход в Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (authError) throw authError;
        
        console.log('Вход успешен:', authData.user?.id);
        
        // 2. Проверяем/создаем запись в users если её нет
        if (authData.user) {
            const { data: existingUser, error: checkError } = await supabase
                .from('users')
                .select('id')
                .eq('id', authData.user.id)
                .maybeSingle();
                
            if (checkError) console.warn('Ошибка проверки пользователя:', checkError);
            
            if (!existingUser) {
                console.log('Создаем запись в users при входе...');
                const { error: insertError } = await supabase
                    .from('users')
                    .insert([{
                        id: authData.user.id,
                        email: authData.user.email,
                        balance: 10000,
                        role: 'user',
                        created_at: new Date().toISOString()
                    }]);
                    
                if (insertError) console.error('Ошибка создания записи:', insertError);
            }
        }
        
        closeModal('login-modal');
        location.reload();
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        errorEl.textContent = error.message || 'Неверный email или пароль';
    }
}

// Проверка авторизации
async function checkAuth() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session) {
            state.user = data.session.user;
            console.log('Пользователь авторизован:', state.user.email);
            
            // Обновляем UI
            document.getElementById('auth-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'block';
            document.getElementById('user-email').textContent = state.user.email;
            
            // Проверяем админа
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', state.user.id)
                .single();
                
            if (userData?.role === 'admin') {
                document.getElementById('admin-btn').style.display = 'block';
            }
            
        } else {
            console.log('Пользователь не авторизован');
            document.getElementById('auth-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('admin-btn').style.display = 'none';
            document.getElementById('user-email').textContent = 'Гость';
        }
    } catch (error) {
        console.error('Ошибка проверки auth:', error);
    }
}

// Выход
async function logout() {
    await supabase.auth.signOut();
    location.reload();
}

// ==================== ОСТАЛЬНЫЕ ФУНКЦИИ ====================

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

function updateUI() {
    document.getElementById('balance').textContent = state.balance;
    document.getElementById('inventory').textContent = state.inventory.length;
    document.getElementById('withdraw-balance').textContent = state.balance;
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
    if (!state.user) { alert('Войдите для открытия кейсов'); showLogin(); return; }
    document.getElementById('preview-title').textContent = selectedCase.name;
    document.getElementById('preview-price').textContent = `Цена: ${selectedCase.price} монет`;
    document.getElementById('preview-modal').style.display = 'block';
}

async function openCase() {
    if (!selectedCase || !state.user) return alert('Ошибка');
    if (state.balance < selectedCase.price) { alert('Недостаточно средств'); closeModal('preview-modal'); return; }
    try {
        const response = await fetch('https://mute-night-5909.zummer-max405.workers.dev/api/open-case', {
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
    if (!state.user) { alert('Войдите для вывода'); showLogin(); return; }
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

// Админ (остается без изменений)
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