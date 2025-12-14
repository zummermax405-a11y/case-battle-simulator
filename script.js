// Конфиг
const SB_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SB_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
const supabase = window.supabase.createClient(SB_URL, SB_KEY);

// Состояние
let state = { user: null, balance: 0, inventory: [] };
let cases = [], skins = [], selectedCase = null;

// Инициализация
// Инициализация
async function init() {
    console.log('Инициализация...');
    await checkAuth();
    await loadData();
    if (state.user) await loadPlayer();
    setupModalListeners();
    updateUI();
    
    // Инициализация админки (ДОБАВЬТЕ ЭТИ 2 СТРОКИ)
    setupAdminDragDrop();
}

// ДОБАВЬТЕ ЭТУ ФУНКЦИЮ ПОСЛЕ init()
function setupAdminDragDrop() {
    // Ждем пока DOM полностью загрузится
    setTimeout(() => {
        const dropZone = document.getElementById('case-drop-zone');
        if (dropZone) {
            dropZone.addEventListener('dragover', allowDrop);
            dropZone.addEventListener('dragleave', dragLeave);
            console.log('Drag & drop инициализирован');
        } else {
            console.warn('Элемент case-drop-zone не найден');
        }
    }, 100);
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


// Переменные для Drag & Drop
let selectedCaseId = null;
let currentCaseSkins = [];

// ==================== DRAG & DROP ФУНКЦИИ ====================

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function dragStart(e, skinId) {
    e.dataTransfer.setData('skinId', skinId);
    e.currentTarget.classList.add('dragging');
}

function dragEnd(e) {
    e.currentTarget.classList.remove('dragging');
}

function dropOnCase(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (!selectedCaseId) {
        alert('Сначала выберите кейс из списка слева');
        return;
    }
    
    const skinId = e.dataTransfer.getData('skinId');
    if (!skinId) return;
    
    // Добавляем скин в текущий кейс
    addSkinToCase(parseInt(skinId));
}

// ==================== АДМИН-ПАНЕЛЬ ====================

function showAdminTab(tabName) {
    // Скрыть все вкладки
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // Убрать активный класс у всех кнопок
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показать выбранную вкладку
    document.getElementById(`admin-${tabName}`).style.display = 'block';
    
    // Активировать кнопку
    event.target.classList.add('active');
    
    // Загрузить данные если нужно
    if (tabName === 'cases') {
        loadCasesForAdmin();
        loadAllSkinsForAdmin();
    } else if (tabName === 'skins') {
        loadAllSkinsForAdmin();
    }
}

// ==================== РАБОТА С КЕЙСАМИ ====================

async function loadCasesForAdmin() {
    try {
        const { data, error } = await supabase
            .from('cases')
            .select('*')
            .order('id');
            
        if (error) throw error;
        
        const container = document.getElementById('cases-list-admin');
        if (!container) return;
        
        container.innerHTML = data.map(caseItem => `
            <div class="drag-item case-admin-item" 
                 onclick="selectCase(${caseItem.id})"
                 style="cursor: pointer; ${selectedCaseId === caseItem.id ? 'border-color: #4cc9f0;' : ''}">
                <div style="font-size: 24px;">${caseItem.emoji || '📦'}</div>
                <div style="font-size: 0.9em;">${caseItem.name}</div>
                <div style="font-size: 0.8em; opacity: 0.7;">${caseItem.price} монет</div>
                <button onclick="event.stopPropagation(); deleteCase(${caseItem.id})" 
                        style="background: #f72585; padding: 3px 8px; font-size: 0.8em; margin-top: 5px;">
                    Удалить
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки кейсов:', error);
    }
}

async function selectCase(caseId) {
    selectedCaseId = caseId;
    
    // Подсветка выбранного кейса
    document.querySelectorAll('.case-admin-item').forEach(item => {
        item.style.borderColor = 'transparent';
    });
    event.currentTarget.style.borderColor = '#4cc9f0';
    
    // Загружаем информацию о кейсе
    const { data: caseData } = await supabase
        .from('cases')
        .select('*')
        .eq('id', caseId)
        .single();
        
    if (caseData) {
        document.getElementById('selected-case-info').innerHTML = `
            <h4>${caseData.emoji || '📦'} ${caseData.name}</h4>
            <p>Цена: ${caseData.price} монет</p>
            <p>ID: ${caseData.id}</p>
        `;
    }
    
    // Загружаем скины этого кейса
    await loadCaseSkins(caseId);
    
    // Показываем кнопку сохранения
    document.getElementById('save-case-btn').style.display = 'block';
}

async function loadCaseSkins(caseId) {
    try {
        const { data, error } = await supabase
            .from('case_skins')
            .select(`
                skin_id,
                skins (*)
            `)
            .eq('case_id', caseId);
            
        if (error) throw error;
        
        currentCaseSkins = data.map(item => item.skin_id);
        
        const container = document.getElementById('case-skins-list');
        if (!container) return;
        
        if (data.length === 0) {
            container.innerHTML = '<p>В кейсе пока нет скинов</p>';
            return;
        }
        
        container.innerHTML = data.map(item => `
            <div class="case-skin-item" id="skin-in-case-${item.skin_id}">
                ${item.skins?.emoji || '🎮'} ${item.skins?.name || 'Скин'} 
                <span class="remove-skin" onclick="removeSkinFromCase(${item.skin_id})">×</span>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки скинов кейса:', error);
    }
}

function addSkinToCase(skinId) {
    if (currentCaseSkins.includes(skinId)) {
        alert('Этот скин уже есть в кейсе!');
        return;
    }
    
    currentCaseSkins.push(skinId);
    updateCaseSkinsDisplay();
}

function removeSkinFromCase(skinId) {
    currentCaseSkins = currentCaseSkins.filter(id => id !== skinId);
    updateCaseSkinsDisplay();
}

function updateCaseSkinsDisplay() {
    const container = document.getElementById('case-skins-list');
    if (!container) return;
    
    // Здесь нужно загрузить информацию о скинах
    // Временное решение - показать ID скинов
    if (currentCaseSkins.length === 0) {
        container.innerHTML = '<p>В кейсе пока нет скинов</p>';
        return;
    }
    
    container.innerHTML = currentCaseSkins.map(skinId => `
        <div class="case-skin-item" id="skin-in-case-${skinId}">
            Скин #${skinId}
            <span class="remove-skin" onclick="removeSkinFromCase(${skinId})">×</span>
        </div>
    `).join('');
}

async function saveCaseSkins() {
    if (!selectedCaseId) {
        alert('Сначала выберите кейс');
        return;
    }
    
    try {
        // Удаляем старые связи
        await supabase
            .from('case_skins')
            .delete()
            .eq('case_id', selectedCaseId);
        
        // Создаем новые связи
        const caseSkinsData = currentCaseSkins.map(skinId => ({
            case_id: selectedCaseId,
            skin_id: skinId,
            weight: 100
        }));
        
        if (caseSkinsData.length > 0) {
            const { error } = await supabase
                .from('case_skins')
                .insert(caseSkinsData);
                
            if (error) throw error;
        }
        
        alert(`Сохранено! В кейс добавлено ${currentCaseSkins.length} скинов`);
        await loadCaseSkins(selectedCaseId);
        
    } catch (error) {
        console.error('Ошибка сохранения кейса:', error);
        alert('Ошибка сохранения: ' + error.message);
    }
}

// ==================== РАБОТА СО СКИНАМИ ====================

async function loadAllSkinsForAdmin() {
    try {
        const { data, error } = await supabase
            .from('skins')
            .select('*')
            .order('id');
            
        if (error) throw error;
        
        const container = document.getElementById('skins-list-admin');
        if (!container) return;
        
        container.innerHTML = data.map(skin => `
            <div class="drag-item" 
                 draggable="true"
                 ondragstart="dragStart(event, ${skin.id})"
                 ondragend="dragEnd(event)"
                 id="skin-${skin.id}">
                <div style="font-size: 24px;">${skin.emoji || '🎮'}</div>
                <div style="font-size: 0.9em;">${skin.name}</div>
                <div style="font-size: 0.8em; opacity: 0.7;">${skin.price} монет</div>
                <div style="font-size: 0.7em; color: ${getRarityColor(skin.rarity)};">
                    ${getRarityName(skin.rarity)}
                </div>
                <button onclick="event.stopPropagation(); deleteSkin(${skin.id})" 
                        style="background: #f72585; padding: 3px 8px; font-size: 0.8em; margin-top: 5px;">
                    Удалить
                </button>
            </div>
        `).join('');
        
    } catch (error) {
        console.error('Ошибка загрузки скинов:', error);
    }
}

function getRarityColor(rarity) {
    switch(rarity) {
        case 'common': return '#4cc9f0';
        case 'rare': return '#4361ee';
        case 'epic': return '#7209b7';
        case 'legendary': return '#f72585';
        default: return '#ffffff';
    }
}

function getRarityName(rarity) {
    switch(rarity) {
        case 'common': return 'Обычный';
        case 'rare': return 'Редкий';
        case 'epic': return 'Эпический';
        case 'legendary': return 'Легендарный';
        default: return 'Обычный';
    }
}

async function createNewSkin() {
    const name = document.getElementById('skin-name').value.trim();
    const price = parseInt(document.getElementById('skin-price').value);
    const rarity = document.getElementById('skin-rarity').value;
    const emoji = document.getElementById('skin-emoji').value.trim() || '🎮';
    const image = document.getElementById('skin-image').value.trim();
    
    if (!name || !price || price <= 0) {
        alert('Введите название и цену скина');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('skins')
            .insert([{
                name,
                price,
                rarity,
                emoji,
                image_url: image || null
            }]);
            
        if (error) throw error;
        
        alert('Скин успешно создан!');
        
        // Очищаем форму
        document.getElementById('skin-name').value = '';
        document.getElementById('skin-price').value = '100';
        document.getElementById('skin-emoji').value = '🎮';
        document.getElementById('skin-image').value = '';
        
        // Обновляем список
        await loadAllSkinsForAdmin();
        
    } catch (error) {
        console.error('Ошибка создания скина:', error);
        alert('Ошибка: ' + error.message);
    }
}

// ==================== УДАЛЕНИЕ ====================

async function deleteCase(caseId) {
    if (!confirm('Удалить этот кейс? Все связи со скинами также удалятся.')) return;
    
    try {
        const { error } = await supabase
            .from('cases')
            .delete()
            .eq('id', caseId);
            
        if (error) throw error;
        
        alert('Кейс удален');
        await loadCasesForAdmin();
        
        if (selectedCaseId === caseId) {
            selectedCaseId = null;
            document.getElementById('selected-case-info').innerHTML = '<p>Выберите кейс слева</p>';
            document.getElementById('case-skins-list').innerHTML = '';
            document.getElementById('save-case-btn').style.display = 'none';
        }
        
    } catch (error) {
        console.error('Ошибка удаления кейса:', error);
        alert('Ошибка удаления: ' + error.message);
    }
}

async function deleteSkin(skinId) {
    if (!confirm('Удалить этот скин? Он также удалится из всех кейсов.')) return;
    
    try {
        const { error } = await supabase
            .from('skins')
            .delete()
            .eq('id', skinId);
            
        if (error) throw error;
        
        alert('Скин удален');
        await loadAllSkinsForAdmin();
        
        // Если этот скин был в текущем кейсе
        if (currentCaseSkins.includes(skinId)) {
            currentCaseSkins = currentCaseSkins.filter(id => id !== skinId);
            updateCaseSkinsDisplay();
        }
        
    } catch (error) {
        console.error('Ошибка удаления скина:', error);
        alert('Ошибка удаления: ' + error.message);
    }
}

// ==================== ОБНОВЛЕННАЯ createNewCase ====================

async function createNewCase() {
    const name = document.getElementById('case-name').value.trim();
    const price = parseInt(document.getElementById('case-price').value);
    const emoji = document.getElementById('case-emoji').value.trim() || '📦';
    
    if (!name || !price || price <= 0) {
        alert('Введите название и цену кейса');
        return;
    }
    
    try {
        const { error } = await supabase
            .from('cases')
            .insert([{
                name,
                price,
                emoji
            }]);
            
        if (error) throw error;
        
        alert('Кейс создан!');
        
        // Очищаем форму
        document.getElementById('case-name').value = '';
        document.getElementById('case-price').value = '';
        document.getElementById('case-emoji').value = '📦';
        
        // Обновляем список
        await loadCasesForAdmin();
        
    } catch (error) {
        console.error('Ошибка создания кейса:', error);
        alert('Ошибка: ' + error.message);
    }
}

// ==================== ОБНОВЛЕНИЕ ОТКРЫТИЯ КЕЙСА ====================

async function openCase() {
    if (!selectedCase || !state.user) return alert('Ошибка');
    if (state.balance < selectedCase.price) { 
        alert('Недостаточно средств'); 
        closeModal('preview-modal'); 
        return; 
    }
    
    try {
        // Получаем скины из этого кейса
        const { data: caseSkins, error: skinsError } = await supabase
            .from('case_skins')
            .select(`
                skin_id,
                weight,
                skins (*)
            `)
            .eq('case_id', selectedCase.id);
            
        if (skinsError) throw skinsError;
        
        if (!caseSkins || caseSkins.length === 0) {
            alert('В этом кейсе нет скинов!');
            return;
        }
        
        // Выбираем случайный скин с учетом веса
        const totalWeight = caseSkins.reduce((sum, item) => sum + (item.weight || 100), 0);
        let random = Math.random() * totalWeight;
        let selectedSkin = null;
        
        for (const item of caseSkins) {
            random -= (item.weight || 100);
            if (random <= 0) {
                selectedSkin = item.skins;
                break;
            }
        }
        
        if (!selectedSkin) {
            selectedSkin = caseSkins[0].skins;
        }
        
        // Обновляем баланс пользователя
        const newBalance = state.balance - selectedCase.price;
        const { error: updateError } = await supabase
            .from('users')
            .update({ balance: newBalance })
            .eq('id', state.user.id);
            
        if (updateError) throw updateError;
        
        // Добавляем скин в инвентарь
        const { error: invError } = await supabase
            .from('player_inventory')
            .insert([{
                player_id: state.user.id,
                skin_id: selectedSkin.id,
                created_at: new Date().toISOString()
            }]);
            
        if (invError) throw invError;
        
        // Обновляем состояние
        state.balance = newBalance;
        updateUI();
        
        // Показываем результат
        alert(`🎉 Вы выиграли: ${selectedSkin.emoji || '🎮'} ${selectedSkin.name} (${getRarityName(selectedSkin.rarity)})!`);
        closeModal('preview-modal');
        
        // Перезагружаем данные игрока
        await loadPlayer();
        
    } catch (error) {
        console.error('Ошибка открытия кейса:', error);
        alert('Ошибка: ' + (error.message || 'Не удалось открыть кейс'));
    }
}