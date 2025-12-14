// Конфиг
const WORKER = 'https://mute-night-5909.zummer-max405.workers.dev';
const SB_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp0dHNnaXprdXlpcG9sY252YW5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg0MzM4MzQsImV4cCI6MjA1NDAwOTgzNH0.3azU2-uZ5YFzrhXZSmQOsl9n3oQN8yVJjRfCmG-3F9Y'; // Используйте anon key вместо publishable
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

// Состояние
let state = { user: null, balance: 0, inventory: [], casesOpened: 0 };
let cases = [], skins = [], selectedCase = null;

// Инициализация
async function init() {
    console.log('Инициализация приложения...');
    await checkAuth();
    await loadData();
    if (state.user) {
        await loadPlayer();
    }
    setupModalListeners();
    updateUI();
}

// Обработчики закрытия модалок
function setupModalListeners() {
    // Закрытие модалок при клике вне их
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
    
    // Закрытие модалок на Escape
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal').forEach(modal => {
                modal.style.display = 'none';
            });
        }
    });
}

// Авторизация
async function checkAuth() {
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (data.session) {
            state.user = data.session.user;
            console.log('Пользователь авторизован:', state.user.email);
            
            // Показываем/скрываем кнопки
            document.getElementById('auth-btn').style.display = 'none';
            document.getElementById('logout-btn').style.display = 'block';
            document.getElementById('user-email').textContent = state.user.email;
            
            // Синхронизируем с users таблицей
            const { error: upsertError } = await supabase.from('users').upsert({
                id: state.user.id,
                email: state.user.email,
                balance: 10000,
                role: 'user',
                updated_at: new Date().toISOString()
            }, { 
                onConflict: 'id',
                ignoreDuplicates: false 
            });
            
            if (upsertError) {
                console.error('Ошибка синхронизации:', upsertError);
            }
            
            // Проверяем админа
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('role')
                .eq('id', state.user.id)
                .single();
            
            if (!userError && userData?.role === 'admin') {
                document.getElementById('admin-btn').style.display = 'block';
            } else {
                document.getElementById('admin-btn').style.display = 'none';
            }
        } else {
            console.log('Пользователь не авторизован');
            document.getElementById('auth-btn').style.display = 'block';
            document.getElementById('logout-btn').style.display = 'none';
            document.getElementById('admin-btn').style.display = 'none';
            document.getElementById('user-email').textContent = 'Гость';
        }
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
    }
}

function showAuth() {
    document.getElementById('auth-modal').style.display = 'block';
}

async function login() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!email || !password) {
        alert('Введите email и пароль');
        return;
    }
    
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            alert('Ошибка входа: ' + error.message);
        } else {
            document.getElementById('auth-modal').style.display = 'none';
            location.reload();
        }
    } catch (error) {
        alert('Ошибка соединения');
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
            alert('Регистрация успешна! Проверьте email для подтверждения.');
            document.getElementById('auth-modal').style.display = 'none';
        }
    } catch (error) {
        alert('Ошибка соединения');
    }
}

async function logout() {
    try {
        await supabase.auth.signOut();
        state.user = null;
        state.balance = 0;
        state.inventory = [];
        location.reload();
    } catch (error) {
        console.error('Ошибка выхода:', error);
    }
}

// Загрузка данных
async function loadData() {
    try {
        console.log('Загрузка данных...');
        const [{ data: c, error: caseError }, { data: s, error: skinError }] = await Promise.all([
            supabase.from('cases').select('*'),
            supabase.from('skins').select('*')
        ]);
        
        if (caseError) throw caseError;
        if (skinError) throw skinError;
        
        cases = c || [];
        skins = s || [];
        console.log('Загружено кейсов:', cases.length, 'скинов:', skins.length);
        
        renderCases();
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        alert('Ошибка загрузки данных');
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
            
        if (error) throw error;
        
        if (data) {
            state.balance = data.balance || 0;
        }
        
        // Загружаем инвентарь
        const { data: inv, error: invError } = await supabase
            .from('player_inventory')
            .select('skin_id')
            .eq('player_id', state.user.id);
            
        if (!invError) {
            state.inventory = inv || [];
        }
        
        updateUI();
        renderInventory();
    } catch (error) {
        console.error('Ошибка загрузки данных игрока:', error);
    }
}

// UI
function updateUI() {
    document.getElementById('balance').textContent = state.balance;
    document.getElementById('inventory').textContent = state.inventory.length;
    document.getElementById('withdraw-balance').textContent = state.balance;
}

function renderCases() {
    const casesContainer = document.getElementById('cases');
    if (!casesContainer) return;
    
    if (cases.length === 0) {
        casesContainer.innerHTML = '<p>Кейсы временно отсутствуют</p>';
        return;
    }
    
    casesContainer.innerHTML = cases.map(c => `
        <div class="case" onclick="previewCase(${c.id})">
            <h3>${c.emoji || '📦'} ${c.name}</h3>
            <p>${c.price} монет</p>
            <small>ID: ${c.id}</small>
        </div>
    `).join('');
}

function renderInventory() {
    const inventoryContainer = document.getElementById('inventory-list');
    if (!inventoryContainer) return;
    
    if (state.inventory.length === 0) {
        inventoryContainer.innerHTML = '<p>Инвентарь пуст</p>';
        return;
    }
    
    // Получаем информацию о скинах
    const inventoryItems = state.inventory.map(item => {
        const skin = skins.find(s => s.id === item.skin_id);
        return skin ? `
            <div class="skin">
                <h4>${skin.name || 'Скин'}</h4>
                <p>Цена: ${skin.price || '?'} монет</p>
                <small>ID: ${skin.id}</small>
            </div>
        ` : `
            <div class="skin">
                <p>Скин #${item.skin_id}</p>
            </div>
        `;
    }).join('');
    
    inventoryContainer.innerHTML = inventoryItems;
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
        document.getElementById('preview-modal').style.display = 'none';
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
            document.getElementById('preview-modal').style.display = 'none';
            
            // Перезагружаем данные игрока
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
    
    document.getElementById('withdraw-balance').textContent = state.balance;
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
        
        alert('Заявка на вывод создана! Администратор свяжется с вами в Telegram.');
        document.getElementById('withdraw-modal').style.display = 'none';
        
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
                Дата: ${new Date(r.created_at).toLocaleString()}<br>
                Статус: <span class="status-${r.status}">${r.status}</span>
                ${r.status === 'pending' ? `
                    <div style="margin-top: 10px;">
                        <button onclick="approveRequest('${r.id}')" style="background: #00b894; margin-right: 5px;">✅ Одобрить</button>
                        <button onclick="rejectRequest('${r.id}')" style="background: #f72585;">❌ Отклонить</button>
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
        
        adminPanel(); // Обновляем список
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
        
        adminPanel(); // Обновляем список
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
        
        // Обновляем список кейсов
        await loadData();
    } catch (error) {
        console.error('Ошибка создания кейса:', error);
        alert('Ошибка при создании кейса');
    }
}

// Запуск
document.addEventListener('DOMContentLoaded', init);