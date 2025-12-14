// Конфиг
const WORKER = 'https://mute-night-5909.zummer-max405.workers.dev';
const SB_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
// Используем правильный анонимный ключ (без 'sb_publishable_' префикса)
const SB_KEY = 'MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

// Состояние
let state = { user: null, balance: 0, inventory: [] };
let cases = [], skins = [], selectedCase = null;

// Инициализация
async function init() {
    console.log('Инициализация...');
    try {
        await checkAuth();
        await loadData();
        if (state.user) await loadPlayer();
        setupModalListeners();
        updateUI();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        alert('Ошибка загрузки приложения');
    }
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
function closeModal(id) { 
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none'; 
}

// Авторизация
async function checkAuth() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session) {
            state.user = data.session.user;
            console.log('Пользователь авторизован:', state.user.email);
            
            // Обновляем UI
            const authBtn = document.getElementById('auth-btn');
            const logoutBtn = document.getElementById('logout-btn');
            const userEmail = document.getElementById('user-email');
            
            if (authBtn) authBtn.style.display = 'none';
            if (logoutBtn) logoutBtn.style.display = 'block';
            if (userEmail) userEmail.textContent = state.user.email;
            
            // Создаем/обновляем пользователя в таблице users
            try {
                await supabase.from('users').upsert({
                    id: state.user.id, 
                    email: state.user.email, 
                    balance: 10000, 
                    role: 'user',
                    created_at: new Date().toISOString()
                }, { 
                    onConflict: 'id',
                    ignoreDuplicates: false 
                });
            } catch (upsertError) {
                console.warn('Ошибка синхронизации пользователя:', upsertError);
            }
            
            // Проверяем роль админа
            try {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('role')
                    .eq('id', state.user.id)
                    .single();
                    
                if (!userError && userData?.role === 'admin') {
                    const adminBtn = document.getElementById('admin-btn');
                    if (adminBtn) adminBtn.style.display = 'block';
                }
            } catch (adminError) {
                console.warn('Ошибка проверки админа:', adminError);
            }
        } else {
            console.log('Пользователь не авторизован');
            // Обновляем UI для гостя
            const authBtn = document.getElementById('auth-btn');
            const logoutBtn = document.getElementById('logout-btn');
            const adminBtn = document.getElementById('admin-btn');
            const userEmail = document.getElementById('user-email');
            
            if (authBtn) authBtn.style.display = 'block';
            if (logoutBtn) logoutBtn.style.display = 'none';
            if (adminBtn) adminBtn.style.display = 'none';
            if (userEmail) userEmail.textContent = 'Гость';
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        // Показываем кнопку входа в случае ошибки
        const authBtn = document.getElementById('auth-btn');
        if (authBtn) authBtn.style.display = 'block';
    }
}

function showAuth() { 
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'block'; 
}

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    try {
        const { error } = await supabase.auth.signInWithPassword({ 
            email, 
            password 
        });
        
        if (error) {
            alert('Ошибка входа: ' + error.message);
        } else {
            closeModal('auth-modal');
            setTimeout(() => location.reload(), 500);
        }
    } catch (error) {
        console.error('Ошибка входа:', error);
        alert('Ошибка соединения с сервером');
    }
}

async function register() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    if (password.length < 6) {
        alert('Пароль должен быть не менее 6 символов');
        return;
    }
    
    try {
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                emailRedirectTo: window.location.origin
            }
        });
        
        if (error) {
            alert('Ошибка регистрации: ' + error.message);
        } else {
            alert('Регистрация успешна! Проверьте email для подтверждения (или войдите сразу).');
            closeModal('auth-modal');
        }
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        alert('Ошибка соединения с сервером');
    }
}

async function logout() { 
    try {
        await supabase.auth.signOut();
        state.user = null;
        state.balance = 0;
        state.inventory = [];
        setTimeout(() => location.reload(), 500);
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// Загрузка данных
async function loadData() {
    try {
        console.log('Загрузка данных...');
        const [{ data: casesData, error: casesError }, { data: skinsData, error: skinsError }] = await Promise.all([
            supabase.from('cases').select('*'),
            supabase.from('skins').select('*')
        ]);
        
        if (casesError) {
            console.error('Ошибка загрузки кейсов:', casesError);
            cases = [];
        } else {
            cases = casesData || [];
        }
        
        if (skinsError) {
            console.error('Ошибка загрузки скинов:', skinsError);
            skins = [];
        } else {
            skins = skinsData || [];
        }
        
        console.log('Загружено кейсов:', cases.length, 'скинов:', skins.length);
        renderCases();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        const casesContainer = document.getElementById('cases');
        if (casesContainer) {
            casesContainer.innerHTML = '<p>Ошибка загрузки кейсов</p>';
        }
    }
}

async function loadPlayer() {
    if (!state.user) return;
    
    try {
        // Загружаем баланс
        const { data, error } = await supabase
            .from('users')
            .select('balance')
            .eq('id', state.user.id)
            .single();
            
        if (!error && data) {
            state.balance = data.balance || 0;
        }
        
        // Загружаем инвентарь
        const { data: inventoryData, error: inventoryError } = await supabase
            .from('player_inventory')
            .select('skin_id')
            .eq('player_id', state.user.id);
            
        if (!inventoryError) {
            state.inventory = inventoryData || [];
        }
        
        updateUI();
        renderInventory();
    } catch (error) {
        console.error('Ошибка загрузки данных игрока:', error);
    }
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
    if (!container) {
        console.error('Элемент #cases не найден');
        return;
    }
    
    if (!cases || cases.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">Кейсы временно отсутствуют</p>';
        return;
    }
    
    container.innerHTML = cases.map(c => `
        <div class="case" onclick="previewCase(${c.id})">
            <h3>${c.emoji || '📦'} ${c.name || 'Без названия'}</h3>
            <p>${c.price || 0} монет</p>
        </div>
    `).join('');
}

function renderInventory() {
    const container = document.getElementById('inventory-list');
    if (!container) {
        console.error('Элемент #inventory-list не найден');
        return;
    }
    
    if (!state.inventory || state.inventory.length === 0) {
        container.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px;">Инвентарь пуст</p>';
        return;
    }
    
    container.innerHTML = state.inventory.map(item => {
        const skin = skins.find(s => s.id === item.skin_id);
        return `
            <div class="skin">
                <h4>${skin?.name || 'Скин'}</h4>
                <p>${skin?.price || '?'} монет</p>
            </div>
        `;
    }).join('');
}

// Кейсы
function previewCase(id) {
    selectedCase = cases.find(c => c.id === id);
    if (!selectedCase) {
        alert('Кейс не найден');
        return;
    }
    
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
    if (!selectedCase || !state.user) {
        alert('Ошибка: нет выбранного кейса или пользователя');
        return;
    }
    
    if (state.balance < selectedCase.price) {
        alert('Недостаточно средств');
        closeModal('preview-modal');
        return;
    }
    
    try {
        console.log('Открываем кейс:', selectedCase.id);
        
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
        console.log('Результат открытия:', result);
        
        if (result.success) {
            state.balance = result.newBalance;
            updateUI();
            alert('Вы выиграли: ' + (result.skin || 'скин!'));
            closeModal('preview-modal');
            await loadPlayer();
        } else {
            alert('Ошибка при открытии: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Ошибка открытия кейса:', error);
        alert('Ошибка соединения с сервером');
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
        alert('Минимум 1000 монет для вывода');
        return;
    }
    
    document.getElementById('withdraw-modal').style.display = 'block';
}

async function createWithdraw() {
    const amount = parseInt(document.getElementById('withdraw-amount').value);
    const telegram = document.getElementById('withdraw-tg').value.trim();
    
    if (!amount || amount < 1000 || amount > state.balance) {
        alert('Сумма должна быть от 1000 до ' + state.balance + ' монет');
        return;
    }
    
    if (!telegram || !telegram.includes('@')) {
        alert('Введите корректный Telegram (@username)');
        return;
    }
    
    try {
        const { error } = await supabase.from('withdrawal_requests').insert([{
            player_id: state.user.id,
            amount: amount,
            telegram_contact: telegram,
            status: 'pending',
            created_at: new Date().toISOString()
        }]);
        
        if (error) throw error;
        
        alert('Заявка на вывод создана! Администратор свяжется с вами.');
        closeModal('withdraw-modal');
        
        // Сбрасываем форму
        document.getElementById('withdraw-amount').value = '';
        document.getElementById('withdraw-tg').value = '';
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        alert('Ошибка при создании заявки');
    }
}

// Админ
async function adminPanel() {
    if (!state.user) return;
    
    document.getElementById('admin-modal').style.display = 'block';
    
    try {
        // Проверяем права админа
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('id', state.user.id)
            .single();
        
        if (userData?.role !== 'admin') {
            document.getElementById('admin-content').innerHTML = '<p>У вас нет прав администратора</p>';
            return;
        }
        
        // Загружаем заявки
        const { data, error } = await supabase
            .from('withdrawal_requests')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const requestsHtml = (data || []).map(r => `
            <div class="request-item">
                <strong>Заявка #${r.id}</strong><br>
                Игрок: ${r.player_id}<br>
                Сумма: ${r.amount} монет<br>
                Telegram: ${r.telegram_contact}<br>
                Статус: <span class="status-${r.status}">${r.status}</span>
                ${r.status === 'pending' ? `
                    <div style="margin-top: 10px;">
                        <button onclick="approveRequest('${r.id}')">✅ Одобрить</button>
                        <button onclick="rejectRequest('${r.id}')">❌ Отклонить</button>
                    </div>
                ` : ''}
            </div>
        `).join('');
        
        document.getElementById('withdraw-list').innerHTML = requestsHtml || '<p>Заявок нет</p>';
        
    } catch (error) {
        console.error('Ошибка загрузки админ-панели:', error);
        document.getElementById('withdraw-list').innerHTML = '<p>Ошибка загрузки заявок</p>';
    }
}

async function approveRequest(id) {
    if (!confirm('Одобрить заявку?')) return;
    
    try {
        const { error } = await supabase
            .from('withdrawal_requests')
            .update({ 
                status: 'approved',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        adminPanel();
    } catch (error) {
        console.error('Ошибка одобрения заявки:', error);
        alert('Ошибка при одобрении заявки');
    }
}

async function rejectRequest(id) {
    if (!confirm('Отклонить заявку?')) return;
    
    try {
        const { error } = await supabase
            .from('withdrawal_requests')
            .update({ 
                status: 'rejected',
                updated_at: new Date().toISOString()
            })
            .eq('id', id);
        
        if (error) throw error;
        
        adminPanel();
    } catch (error) {
        console.error('Ошибка отклонения заявки:', error);
        alert('Ошибка при отклонении заявки');
    }
}

async function createNewCase() {
    const name = document.getElementById('case-name').value.trim();
    const price = parseInt(document.getElementById('case-price').value);
    
    if (!name || !price || price <= 0) {
        alert('Введите корректное название и цену');
        return;
    }
    
    try {
        const { error } = await supabase.from('cases').insert([{ 
            name, 
            price, 
            emoji: '📦',
            created_at: new Date().toISOString()
        }]);
        
        if (error) throw error;
        
        alert('Кейс успешно создан!');
        document.getElementById('case-name').value = '';
        document.getElementById('case-price').value = '';
        
        await loadData();
    } catch (error) {
        console.error('Ошибка создания кейса:', error);
        alert('Ошибка при создании кейса');
    }
}

// Запуск
document.addEventListener('DOMContentLoaded', init);