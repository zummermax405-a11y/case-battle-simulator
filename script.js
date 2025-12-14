// Настройка Supabase
const SUPABASE_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let currentCase = null;
let cases = [];
let skins = [];
let caseSkins = [];

// Инициализация
document.addEventListener('DOMContentLoaded', init);

async function init() {
    // Проверка авторизации
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUser = user;
        updateUI();
    }
    
    // Загрузка данных
    await loadCases();
    await loadSkins();
    await loadCaseSkins();
    
    // Показываем кейсы
    showTab('cases');
}

function updateUI() {
    const userEmail = document.getElementById('user-email');
    const authBtn = document.getElementById('auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminTab = document.getElementById('admin-tab');
    
    if (currentUser) {
        userEmail.textContent = currentUser.email;
        authBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        
        // Показываем админку если email содержит admin
        if (currentUser.email.includes('admin')) {
            adminTab.style.display = 'block';
        }
    } else {
        userEmail.textContent = 'Гость';
        authBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        adminTab.style.display = 'none';
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
    document.getElementById(tabName + '-tab').classList.add('active');
    
    // Активируем кнопку
    document.querySelector(`.tab[onclick="showTab('${tabName}')"]`).classList.add('active');
    
    // Загружаем данные если нужно
    if (tabName === 'cases') {
        renderCases();
    } else if (tabName === 'inventory') {
        loadUserInventory();
    } else if (tabName === 'admin') {
        populateAdminSelects();
    }
}

// Загрузка кейсов из БД
async function loadCases() {
    const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Ошибка загрузки кейсов:', error);
        return;
    }
    
    cases = data || [];
}

// Загрузка скинов из БД
async function loadSkins() {
    const { data, error } = await supabase
        .from('skins')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Ошибка загрузки скинов:', error);
        return;
    }
    
    skins = data || [];
}

// Загрузка связей кейсов и скинов
async function loadCaseSkins() {
    const { data, error } = await supabase
        .from('case_skins')
        .select('*, cases(name), skins(name, price)');
    
    if (error) {
        console.error('Ошибка загрузки связей:', error);
        return;
    }
    
    caseSkins = data || [];
}

// Отображение кейсов
function renderCases() {
    const container = document.getElementById('cases-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    cases.forEach(caseItem => {
        // Получаем скины для этого кейса
        const caseItems = caseSkins.filter(cs => cs.case_id === caseItem.id);
        
        const caseCard = document.createElement('div');
        caseCard.className = 'case-card';
        caseCard.innerHTML = `
            <h3>${caseItem.name}</h3>
            <p>💰 ${caseItem.price} ₽</p>
            <p>🎁 ${caseItems.length} предметов</p>
            <button onclick="openCaseModal(${caseItem.id})" style="margin-top:10px;width:100%">Открыть</button>
        `;
        container.appendChild(caseCard);
    });
}

// Модальные окна
function showAuth() {
    document.getElementById('auth-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

function closeOpenModal() {
    document.getElementById('open-modal').style.display = 'none';
}

// Авторизация
async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const error = document.getElementById('auth-error');
    
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
    showTab('cases');
}

async function register() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const error = document.getElementById('auth-error');
    
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
    }, 2000);
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateUI();
    showTab('cases');
}

// Админ-функции
async function createCase() {
    const name = document.getElementById('case-name').value;
    const price = document.getElementById('case-price').value;
    
    if (!name || !price) {
        alert('Заполните все поля');
        return;
    }
    
    const { error } = await supabase
        .from('cases')
        .insert([{ name, price: parseInt(price) }]);
    
    if (error) {
        alert('Ошибка создания кейса: ' + error.message);
        return;
    }
    
    alert('Кейс создан!');
    document.getElementById('case-name').value = '';
    document.getElementById('case-price').value = '';
    await loadCases();
    populateAdminSelects();
}

async function createSkin() {
    const name = document.getElementById('skin-name').value;
    const price = document.getElementById('skin-price').value;
    
    if (!name || !price) {
        alert('Заполните все поля');
        return;
    }
    
    const { error } = await supabase
        .from('skins')
        .insert([{ name, price: parseInt(price) }]);
    
    if (error) {
        alert('Ошибка создания скина: ' + error.message);
        return;
    }
    
    alert('Скин создан!');
    document.getElementById('skin-name').value = '';
    document.getElementById('skin-price').value = '';
    await loadSkins();
    populateAdminSelects();
}

async function addSkinToCase() {
    const caseId = document.getElementById('case-select').value;
    const skinId = document.getElementById('skin-select').value;
    const chance = document.getElementById('skin-chance').value;
    
    if (!caseId || !skinId || !chance) {
        alert('Заполните все поля');
        return;
    }
    
    const { error } = await supabase
        .from('case_skins')
        .insert([{ case_id: caseId, skin_id: skinId, chance: parseInt(chance) }]);
    
    if (error) {
        alert('Ошибка добавления скина: ' + error.message);
        return;
    }
    
    alert('Скин добавлен в кейс!');
    document.getElementById('skin-chance').value = '';
    await loadCaseSkins();
}

function populateAdminSelects() {
    const caseSelect = document.getElementById('case-select');
    const skinSelect = document.getElementById('skin-select');
    const testCaseSelect = document.getElementById('test-case');
    
    caseSelect.innerHTML = '<option value="">Выберите кейс</option>';
    testCaseSelect.innerHTML = '<option value="">Выберите кейс для теста</option>';
    
    cases.forEach(c => {
        const option1 = document.createElement('option');
        option1.value = c.id;
        option1.textContent = c.name;
        caseSelect.appendChild(option1);
        
        const option2 = document.createElement('option');
        option2.value = c.id;
        option2.textContent = c.name;
        testCaseSelect.appendChild(option2);
    });
    
    skinSelect.innerHTML = '<option value="">Выберите скин</option>';
    skins.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.name} (${s.price} ₽)`;
        skinSelect.appendChild(option);
    });
}

// Тестовое открытие кейса
async function testOpenCase() {
    const caseId = document.getElementById('test-case').value;
    if (!caseId) {
        alert('Выберите кейс');
        return;
    }
    
    const result = await openCase(caseId);
    document.getElementById('test-result').innerHTML = `
        <p>Вы выиграли: ${result.skin.name}</p>
        <p>Цена: ${result.skin.price} ₽</p>
        <p>Шанс был: ${result.chance}%</p>
    `;
}

// Основное открытие кейса
function openCaseModal(caseId) {
    if (!currentUser) {
        showAuth();
        return;
    }
    
    currentCase = cases.find(c => c.id === caseId);
    if (!currentCase) return;
    
    // Получаем скины для этого кейса
    const caseItems = caseSkins
        .filter(cs => cs.case_id === caseId)
        .map(cs => ({
            id: cs.skin_id,
            name: cs.skins.name,
            price: cs.skins.price,
            chance: cs.chance
        }));
    
    if (caseItems.length === 0) {
        alert('В этом кейсе нет предметов!');
        return;
    }
    
    // Показываем рулетку
    document.getElementById('open-modal').style.display = 'flex';
    setupRoulette(caseItems);
}

// Настройка рулетки
function setupRoulette(items) {
    const rouletteItems = document.getElementById('roulette-items');
    rouletteItems.innerHTML = '';
    rouletteItems.style.transform = 'rotate(0deg)';
    
    // Создаем элементы рулетки
    const angle = 360 / items.length;
    
    items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'roulette-item';
        itemElement.innerHTML = `<div>${item.name}</div><small>${item.chance}%</small>`;
        
        // Позиционируем по кругу
        const itemAngle = angle * index;
        const radius = 150; // Радиус рулетки
        
        const x = radius * Math.cos((itemAngle - 90) * Math.PI / 180);
        const y = radius * Math.sin((itemAngle - 90) * Math.PI / 180);
        
        itemElement.style.transform = `translate(${x}px, ${y}px) rotate(${itemAngle}deg)`;
        itemElement.style.transformOrigin = '0 0';
        
        rouletteItems.appendChild(itemElement);
    });
}

// Запуск рулетки
async function startRoulette() {
    if (!currentCase || !currentUser) return;
    
    const spinBtn = document.getElementById('spin-btn');
    spinBtn.disabled = true;
    
    // Открываем кейс и получаем выигрыш
    const result = await openCase(currentCase.id);
    
    if (!result) {
        alert('Ошибка открытия кейса');
        spinBtn.disabled = false;
        return;
    }
    
    // Находим индекс выигранного предмета
    const caseItems = caseSkins
        .filter(cs => cs.case_id === currentCase.id)
        .map(cs => cs.skin_id);
    
    const winIndex = caseItems.indexOf(result.skin.id);
    
    // Вращаем рулетку
    const rouletteItems = document.getElementById('roulette-items');
    const angle = 360 / caseItems.length;
    const winAngle = 360 - (winIndex * angle) + 720; // 2 полных оборота + позиция выигрыша
    
    rouletteItems.style.transition = 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)';
    rouletteItems.style.transform = `rotate(${winAngle}deg)`;
    
    // Показываем результат
    setTimeout(() => {
        document.getElementById('win-result').innerHTML = `
            <h3>🎉 Поздравляем!</h3>
            <p>Вы выиграли: ${result.skin.name}</p>
            <p>💰 Цена: ${result.skin.price} ₽</p>
        `;
        spinBtn.disabled = false;
    }, 4000);
}

// Функция открытия кейса (логика выпадения)
async function openCase(caseId) {
    // Получаем скины для этого кейса
    const items = caseSkins
        .filter(cs => cs.case_id === caseId)
        .map(cs => ({
            id: cs.skin_id,
            name: cs.skins.name,
            price: cs.skins.price,
            chance: cs.chance
        }));
    
    if (items.length === 0) {
        alert('В этом кейсе нет предметов!');
        return null;
    }
    
    // Проверяем баланс
    const userBalance = parseInt(document.getElementById('balance').textContent);
    const caseItem = cases.find(c => c.id === caseId);
    
    if (userBalance < caseItem.price) {
        alert('Недостаточно средств!');
        return null;
    }
    
    // Обновляем баланс
    const newBalance = userBalance - caseItem.price;
    document.getElementById('balance').textContent = newBalance;
    
    // Логика выпадения на основе шансов
    const totalChance = items.reduce((sum, item) => sum + item.chance, 0);
    let random = Math.random() * totalChance;
    
    let selectedItem = null;
    for (const item of items) {
        random -= item.chance;
        if (random <= 0) {
            selectedItem = item;
            break;
        }
    }
    
    if (!selectedItem) {
        selectedItem = items[0];
    }
    
    // Добавляем скин в инвентарь пользователя
    await addToInventory(selectedItem.id);
    
    return {
        skin: selectedItem,
        chance: selectedItem.chance
    };
}

// Добавление в инвентарь
async function addToInventory(skinId) {
    if (!currentUser) return;
    
    const { error } = await supabase
        .from('user_inventory')
        .insert([{ user_id: currentUser.id, skin_id: skinId }]);
    
    if (error) {
        console.error('Ошибка добавления в инвентарь:', error);
    }
}

// Загрузка инвентаря пользователя
async function loadUserInventory() {
    if (!currentUser) return;
    
    const container = document.getElementById('inventory-list');
    if (!container) return;
    
    const { data, error } = await supabase
        .from('user_inventory')
        .select('*, skins(name, price)')
        .eq('user_id', currentUser.id);
    
    if (error) {
        console.error('Ошибка загрузки инвентаря:', error);
        container.innerHTML = '<p>Ошибка загрузки</p>';
        return;
    }
    
    container.innerHTML = '';
    
    if (data.length === 0) {
        container.innerHTML = '<p>Инвентарь пуст</p>';
        return;
    }
    
    data.forEach(item => {
        const skinCard = document.createElement('div');
        skinCard.className = 'skin-card';
        skinCard.innerHTML = `
            <h4>${item.skins.name}</h4>
            <p>💰 ${item.skins.price} ₽</p>
        `;
        container.appendChild(skinCard);
    });
}

// Обработка кликов вне модальных окон
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};