// Настройка Supabase
const SUPABASE_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentCase = null;
let rouletteItems = [];

// Инициализация
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUser = user;
    }
    
    updateUI();
    loadCases();
}

function updateUI() {
    const userEmail = document.getElementById('user-email');
    const authBtn = document.getElementById('auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const balance = document.getElementById('balance');
    
    if (currentUser) {
        userEmail.textContent = currentUser.email;
        authBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        loadUserBalance();
    } else {
        userEmail.textContent = 'Гость';
        authBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        if (balance) balance.textContent = '1000';
    }
}

async function loadUserBalance() {
    if (!currentUser) return;
    
    const { data, error } = await supabase
        .from('user_profiles')
        .select('balance')
        .eq('id', currentUser.id)
        .single();
    
    if (!error && data) {
        document.getElementById('balance').textContent = data.balance;
    }
}

// Работа с вкладками
function showTab(tabName) {
    // Скрываем все вкладки
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Показываем нужную вкладку
    const tabElement = document.getElementById(tabName + '-tab');
    if (tabElement) {
        tabElement.classList.add('active');
    }
    
    // Активируем кнопку
    const tabButton = document.querySelector(`.tab[onclick="showTab('${tabName}')"]`);
    if (tabButton) {
        tabButton.classList.add('active');
    }
    
    // Загружаем данные если нужно
    if (tabName === 'inventory') {
        loadInventory();
    }
}

// Загрузка кейсов
async function loadCases() {
    const container = document.getElementById('cases-list');
    if (!container) return;
    
    const { data, error } = await supabase
        .from('cases')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });
    
    if (error) {
        console.error('Ошибка загрузки кейсов:', error);
        container.innerHTML = '<div class="empty">Ошибка загрузки кейсов</div>';
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty">Кейсы временно недоступны</div>';
        return;
    }
    
    container.innerHTML = '';
    
    data.forEach(caseItem => {
        const caseCard = document.createElement('div');
        caseCard.className = 'case-card';
        caseCard.innerHTML = `
            <div class="case-icon"><i class="fas fa-box"></i></div>
            <div class="case-name">${caseItem.name}</div>
            <div class="case-price">${caseItem.price} ₽</div>
            <button onclick="openCaseModal(${caseItem.id}, '${caseItem.name}', ${caseItem.price})" style="margin-top:10px;width:100%">Открыть</button>
        `;
        container.appendChild(caseCard);
    });
}

// Модальные окна
function showAuth() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.style.display = 'none';
}

function closeOpenModal() {
    const modal = document.getElementById('open-modal');
    if (modal) modal.style.display = 'none';
}

// Авторизация
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const error = document.getElementById('auth-error');
    
    if (!email || !password) {
        error.textContent = 'Заполните все поля';
        return;
    }
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (authError) {
        error.textContent = 'Ошибка входа: ' + authError.message;
        return;
    }
    
    currentUser = data.user;
    closeModal();
    updateUI();
    loadCases();
    showTab('cases');
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const error = document.getElementById('auth-error');
    
    if (!email || !password) {
        error.textContent = 'Заполните все поля';
        return;
    }
    
    if (password.length < 6) {
        error.textContent = 'Пароль должен быть не менее 6 символов';
        return;
    }
    
    const { data, error: authError } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (authError) {
        error.textContent = 'Ошибка регистрации: ' + authError.message;
        return;
    }
    
    error.textContent = 'Регистрация успешна! Проверьте почту.';
    setTimeout(() => {
        closeModal();
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }, 2000);
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateUI();
    showTab('cases');
}

// Открытие кейса
async function openCaseModal(caseId, caseName, casePrice) {
    if (!currentUser) {
        showAuth();
        return;
    }
    
    currentCase = { id: caseId, name: caseName, price: casePrice };
    
    // Загружаем скины для этого кейса
    const { data, error } = await supabase
        .from('case_skins')
        .select('skins(name, price, rarity), chance')
        .eq('case_id', caseId);
    
    if (error || !data || data.length === 0) {
        alert('Ошибка загрузки кейса');
        return;
    }
    
    // Сохраняем предметы для рулетки
    rouletteItems = data.map(item => ({
        name: item.skins.name,
        price: item.skins.price,
        rarity: item.skins.rarity,
        chance: item.chance
    }));
    
    // Показываем модалку
    document.getElementById('case-open-title').textContent = `Открытие: ${caseName}`;
    document.getElementById('case-price').textContent = casePrice;
    document.getElementById('win-result').innerHTML = '';
    document.getElementById('open-modal').style.display = 'flex';
    
    // Настраиваем рулетку
    setupRoulette();
}

// Настройка рулетки
function setupRoulette() {
    const wheel = document.getElementById('roulette-wheel');
    if (!wheel) return;
    
    wheel.innerHTML = '';
    wheel.style.transform = 'rotate(0deg)';
    
    const itemCount = rouletteItems.length;
    const angle = 360 / itemCount;
    
    rouletteItems.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'roulette-item';
        itemElement.innerHTML = `<div>${item.name}<br><small>${item.chance}%</small></div>`;
        
        // Цвета в зависимости от редкости
        const colors = {
            'common': '#64748b',
            'uncommon': '#10b981',
            'rare': '#3b82f6',
            'epic': '#8b5cf6',
            'legendary': '#f59e0b'
        };
        
        itemElement.style.backgroundColor = colors[item.rarity] || '#64748b';
        itemElement.style.transform = `rotate(${index * angle}deg)`;
        
        wheel.appendChild(itemElement);
    });
}

// Вращение рулетки
async function spinRoulette() {
    if (!currentUser || !currentCase || rouletteItems.length === 0) return;
    
    const spinBtn = document.getElementById('spin-btn');
    const wheel = document.getElementById('roulette-wheel');
    
    spinBtn.disabled = true;
    spinBtn.textContent = 'Открываем...';
    
    // Выбираем случайный предмет на основе шансов
    const totalChance = rouletteItems.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalChance;
    let winIndex = 0;
    
    for (let i = 0; i < rouletteItems.length; i++) {
        random -= rouletteItems[i].chance;
        if (random <= 0) {
            winIndex = i;
            break;
        }
    }
    
    // Вычисляем угол для выигрышного предмета
    const anglePerItem = 360 / rouletteItems.length;
    const winAngle = 3600 + (360 - (winIndex * anglePerItem)); // 10 полных оборотов + позиция
    
    // Анимация вращения
    wheel.style.transition = 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)';
    wheel.style.transform = `rotate(${winAngle}deg)`;
    
    // Ждем окончания анимации и обрабатываем выигрыш
    setTimeout(async () => {
        const winItem = rouletteItems[winIndex];
        
        // Показываем результат
        document.getElementById('win-result').innerHTML = `
            <h3>🎉 Поздравляем!</h3>
            <p>Вы выиграли: <strong>${winItem.name}</strong></p>
            <p>💰 Стоимость: <strong>${winItem.price} ₽</strong></p>
            <p>📊 Редкость: <strong>${getRarityName(winItem.rarity)}</strong></p>
            <p>🎯 Шанс выпадения: <strong>${winItem.chance}%</strong></p>
        `;
        
        // Обновляем баланс
        await updateBalanceAfterCase(winItem);
        
        spinBtn.disabled = false;
        spinBtn.textContent = `Крутить за ${currentCase.price} ₽`;
    }, 4000);
}

// Обновление баланса после открытия кейса
async function updateBalanceAfterCase(winItem) {
    if (!currentUser) return;
    
    try {
        // Вызываем функцию открытия кейса
        const { data, error } = await supabase.rpc('open_case', {
            user_id_param: currentUser.id,
            case_id_param: currentCase.id
        });
        
        if (error) {
            console.error('Ошибка открытия кейса:', error);
            alert('Ошибка при открытии кейса: ' + error.message);
            return;
        }
        
        // Обновляем баланс на экране
        await loadUserBalance();
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при обработке кейса');
    }
}

function getRarityName(rarity) {
    const names = {
        'common': 'Обычный',
        'uncommon': 'Необычный',
        'rare': 'Редкий',
        'epic': 'Эпический',
        'legendary': 'Легендарный'
    };
    return names[rarity] || rarity;
}

// Загрузка инвентаря
async function loadInventory() {
    if (!currentUser) {
        document.getElementById('inventory-list').innerHTML = 
            '<div class="empty">Войдите в систему чтобы увидеть инвентарь</div>';
        return;
    }
    
    const container = document.getElementById('inventory-list');
    if (!container) return;
    
    const { data, error } = await supabase
        .from('user_inventory')
        .select('id, skins(name, price, rarity), created_at')
        .eq('user_id', currentUser.id)
        .eq('is_sold', false)
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        container.innerHTML = '<div class="empty">Ошибка загрузки инвентаря</div>';
        return;
    }
    
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="empty">Инвентарь пуст</div>';
        return;
    }
    
    container.innerHTML = '';
    
    data.forEach(item => {
        const skinCard = document.createElement('div');
        skinCard.className = 'skin-card';
        skinCard.innerHTML = `
            <h4>${item.skins.name}</h4>
            <p>💰 ${item.skins.price} ₽</p>
            <p>📊 ${getRarityName(item.skins.rarity)}</p>
            <small>${new Date(item.created_at).toLocaleDateString()}</small>
        `;
        container.appendChild(skinCard);
    });
}

// Обработка кликов вне модальных окон
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
};