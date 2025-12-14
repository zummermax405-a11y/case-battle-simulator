// script.js - Исправленная версия

const SUPABASE_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let selectedCaseId = null;
let draggedSkinId = null;

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    init();
});

async function init() {
    // Проверяем авторизацию
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        currentUser = user;
        updateUI();
        loadCases();
        loadInventory();
        loadWithdrawals();
    } else {
        updateUI();
        loadCases();
    }
    
    // Инициализация навигации
    initNavigation();
}

function initNavigation() {
    // Активируем первую вкладку
    showSection('cases-section');
}

function updateUI() {
    const userEmail = document.getElementById('user-email');
    const authBtn = document.getElementById('auth-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const adminBtn = document.getElementById('admin-btn');
    const balance = document.getElementById('balance');
    const inventoryCount = document.getElementById('inventory');
    
    if (currentUser) {
        userEmail.textContent = currentUser.email;
        authBtn.style.display = 'none';
        logoutBtn.style.display = 'flex';
        
        // Проверяем админские права
        checkAdmin();
        
        // Загружаем баланс и инвентарь
        loadUserData();
    } else {
        userEmail.textContent = 'Гость';
        authBtn.style.display = 'flex';
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'none';
        balance.textContent = '0';
        inventoryCount.textContent = '0';
    }
}

async function checkAdmin() {
    // Здесь должна быть проверка на админа
    // Временно показываем кнопку админа всем авторизованным
    const adminBtn = document.getElementById('admin-btn');
    adminBtn.style.display = 'flex';
}

async function loadUserData() {
    // Загружаем баланс пользователя
    const balance = document.getElementById('balance');
    // Здесь должен быть запрос к базе данных
    // Временно ставим 1000
    balance.textContent = '1000';
}

async function loadCases() {
    const casesContainer = document.getElementById('cases');
    
    // Временно создаем тестовые кейсы
    const testCases = [
        { id: 1, name: 'Базовый кейс', price: 100, items: 5 },
        { id: 2, name: 'Премиум кейс', price: 500, items: 10 },
        { id: 3, name: 'Легендарный кейс', price: 1000, items: 15 },
        { id: 4, name: 'Новичковый кейс', price: 50, items: 3 }
    ];
    
    casesContainer.innerHTML = '';
    
    testCases.forEach(caseItem => {
        const caseCard = document.createElement('div');
        caseCard.className = 'case-card';
        caseCard.innerHTML = `
            <div class="case-icon">
                <i class="fas fa-box"></i>
            </div>
            <div class="case-name">${caseItem.name}</div>
            <div class="case-price">${caseItem.price} ₽</div>
            <div class="case-stats">
                <span>${caseItem.items} предметов</span>
                <span><i class="fas fa-fire"></i> Популярный</span>
            </div>
        `;
        caseCard.onclick = () => previewCase(caseItem.id);
        casesContainer.appendChild(caseCard);
    });
}

function showSection(sectionId) {
    // Скрываем все секции
    document.querySelectorAll('.main-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Убираем активный класс у всех кнопок
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Показываем выбранную секцию
    document.getElementById(sectionId).classList.add('active');
    
    // Активируем соответствующую кнопку
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(btn => 
        btn.getAttribute('onclick')?.includes(sectionId)
    );
    if (activeBtn) {
        activeBtn.classList.add('active');
    }
    
    // Загружаем данные для секции
    if (sectionId === 'inventory-section') {
        loadInventory();
    } else if (sectionId === 'withdrawals-section') {
        loadWithdrawals();
    }
}

// Авторизация
function showAuth() {
    document.getElementById('auth-modal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

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
    closeModal('auth-modal');
    updateUI();
    loadCases();
    loadInventory();
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
    
    error.textContent = 'Регистрация успешна! Проверьте вашу почту для подтверждения.';
    setTimeout(() => {
        closeModal('auth-modal');
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';
    }, 2000);
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateUI();
    showSection('cases-section');
}

// Функции для кейсов
function previewCase(caseId) {
    selectedCaseId = caseId;
    // Загружаем информацию о кейсе
    document.getElementById('preview-title').textContent = 'Базовый кейс';
    document.getElementById('preview-price').textContent = '100';
    
    // Показываем предметы
    const previewItems = document.getElementById('preview-items');
    previewItems.innerHTML = '';
    
    const testItems = [
        { name: 'Обычный нож', chance: 40 },
        { name: 'Редкий пистолет', chance: 25 },
        { name: 'Эпическая винтовка', chance: 15 },
        { name: 'Легендарный скин', chance: 10 },
        { name: 'Ультра редкий предмет', chance: 5 },
        { name: 'Секретный артефакт', chance: 5 }
    ];
    
    testItems.forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'preview-item';
        itemEl.innerHTML = `
            <i class="fas fa-gem"></i>
            <div class="preview-item-name">${item.name}</div>
            <div class="preview-item-chance">${item.chance}%</div>
        `;
        previewItems.appendChild(itemEl);
    });
    
    document.getElementById('preview-modal').style.display = 'flex';
}

function openCase() {
    if (!currentUser) {
        alert('Войдите в систему для открытия кейсов');
        return;
    }
    
    alert('Кейс открыт! Вы получили: Обычный нож');
    closeModal('preview-modal');
}

// Инвентарь
async function loadInventory() {
    const inventoryList = document.getElementById('inventory-list');
    const inventoryTotal = document.getElementById('inventory-total');
    const inventoryValue = document.getElementById('inventory-value');
    
    if (!currentUser) {
        inventoryList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <p>Войдите в систему для просмотра инвентаря</p>
            </div>
        `;
        return;
    }
    
    // Тестовые предметы
    const testItems = [
        { name: 'Обычный нож', price: 50 },
        { name: 'Редкий пистолет', price: 200 },
        { name: 'Эпическая винтовка', price: 500 },
        { name: 'Легендарный скин', price: 1000 }
    ];
    
    inventoryList.innerHTML = '';
    let totalValue = 0;
    
    testItems.forEach(item => {
        const skinCard = document.createElement('div');
        skinCard.className = 'skin-card';
        skinCard.innerHTML = `
            <div class="skin-icon">
                <i class="fas fa-gem"></i>
            </div>
            <div class="skin-info">
                <div class="skin-name">${item.name}</div>
                <div class="skin-price">${item.price} ₽</div>
            </div>
        `;
        inventoryList.appendChild(skinCard);
        totalValue += item.price;
    });
    
    inventoryTotal.textContent = testItems.length;
    inventoryValue.textContent = totalValue;
    document.getElementById('inventory-count').textContent = testItems.length;
}

// Вывод средств
function showWithdraw() {
    if (!currentUser) {
        alert('Войдите в систему для вывода средств');
        return;
    }
    
    document.getElementById('withdraw-balance').textContent = document.getElementById('balance').textContent;
    document.getElementById('withdraw-modal').style.display = 'flex';
}

async function createWithdraw() {
    const amount = document.getElementById('withdraw-amount').value;
    const tg = document.getElementById('withdraw-tg').value;
    
    if (!amount || !tg) {
        alert('Заполните все поля');
        return;
    }
    
    if (parseInt(amount) < 1000) {
        alert('Минимальная сумма вывода: 1000 ₽');
        return;
    }
    
    alert(`Заявка на вывод ${amount} ₽ создана! Мы свяжемся с вами в Telegram: ${tg}`);
    closeModal('withdraw-modal');
    loadWithdrawals();
}

async function loadWithdrawals() {
    const withdrawalsHistory = document.getElementById('withdrawals-history');
    
    if (!currentUser) {
        withdrawalsHistory.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-file-invoice-dollar"></i>
                <p>Войдите в систему для просмотра заявок</p>
            </div>
        `;
        return;
    }
    
    // Тестовые заявки
    const testWithdrawals = [
        { id: 1, amount: 1500, status: 'completed', date: '2024-01-15', tg: '@user1' },
        { id: 2, amount: 2000, status: 'pending', date: '2024-01-16', tg: '@user1' },
        { id: 3, amount: 1000, status: 'completed', date: '2024-01-10', tg: '@user1' }
    ];
    
    withdrawalsHistory.innerHTML = '';
    
    testWithdrawals.forEach(withdrawal => {
        const item = document.createElement('div');
        item.className = `withdrawal-item withdrawal-${withdrawal.status}`;
        item.innerHTML = `
            <div class="withdrawal-info">
                <h4>Заявка #${withdrawal.id}</h4>
                <p>${withdrawal.date} • ${withdrawal.tg}</p>
                <p>Статус: ${withdrawal.status === 'completed' ? 'Выполнена' : 'В обработке'}</p>
            </div>
            <div class="withdrawal-amount">${withdrawal.amount} ₽</div>
        `;
        withdrawalsHistory.appendChild(item);
    });
    
    // Обновляем статистику
    const pending = testWithdrawals.filter(w => w.status === 'pending').length;
    const completed = testWithdrawals.filter(w => w.status === 'completed').length;
    const total = testWithdrawals.filter(w => w.status === 'completed')
        .reduce((sum, w) => sum + w.amount, 0);
    
    document.getElementById('pending-withdrawals').textContent = pending;
    document.getElementById('completed-withdrawals').textContent = completed;
    document.getElementById('total-withdrawn').textContent = total;
}

// Админ-панель
function adminPanel() {
    if (!currentUser) return;
    
    document.getElementById('admin-modal').style.display = 'flex';
    loadAdminCases();
    loadAdminSkins();
}

function loadAdminCases() {
    const casesList = document.getElementById('admin-cases-list');
    // Здесь должна быть загрузка кейсов из БД
    casesList.innerHTML = '<div class="admin-item">Базовый кейс (100 ₽)</div>';
}

function loadAdminSkins() {
    const skinsList = document.getElementById('admin-skins-list');
    // Здесь должна быть загрузка скинов из БД
    skinsList.innerHTML = `
        <div class="admin-item" draggable="true" onclick="selectSkin(1)" ondragstart="dragSkin(event, 1)">
            <div class="admin-item-header">
                <span class="admin-item-name">Обычный нож</span>
                <span class="admin-item-price">50 ₽</span>
            </div>
        </div>
        <div class="admin-item" draggable="true" onclick="selectSkin(2)" ondragstart="dragSkin(event, 2)">
            <div class="admin-item-header">
                <span class="admin-item-name">Редкий пистолет</span>
                <span class="admin-item-price">200 ₽</span>
            </div>
        </div>
    `;
}

function createNewCase() {
    const name = document.getElementById('new-case-name').value;
    const price = document.getElementById('new-case-price').value;
    
    if (!name || !price) {
        alert('Заполните все поля');
        return;
    }
    
    alert(`Кейс "${name}" создан!`);
    document.getElementById('new-case-name').value = '';
    document.getElementById('new-case-price').value = '';
    loadAdminCases();
}

function createNewSkin() {
    const name = document.getElementById('new-skin-name').value;
    const price = document.getElementById('new-skin-price').value;
    
    if (!name || !price) {
        alert('Заполните все поля');
        return;
    }
    
    alert(`Скин "${name}" создан!`);
    document.getElementById('new-skin-name').value = '';
    document.getElementById('new-skin-price').value = '100';
    loadAdminSkins();
}

// Drag and Drop для админ-панели
function dragSkin(event, skinId) {
    draggedSkinId = skinId;
    event.dataTransfer.setData('text/plain', skinId);
}

function allowDrop(event) {
    event.preventDefault();
    event.currentTarget.classList.add('drag-over');
}

function dragLeave(event) {
    event.currentTarget.classList.remove('drag-over');
}

function dropOnCase(event) {
    event.preventDefault();
    event.currentTarget.classList.remove('drag-over');
    
    const skinId = event.dataTransfer.getData('text/plain');
    if (!skinId) return;
    
    const chance = prompt('Укажите шанс выпадения (1-100):', '50');
    if (!chance || isNaN(chance) || chance < 1 || chance > 100) {
        alert('Введите корректный шанс (1-100)');
        return;
    }
    
    // Добавляем скин в список кейса
    const skinsList = document.getElementById('case-skins-list');
    const skinItem = document.createElement('div');
    skinItem.className = 'case-skin-item';
    skinItem.innerHTML = `
        <span>Скин #${skinId} (шанс: ${chance}%)</span>
        <input type="number" class="chance-input" value="${chance}" min="1" max="100">
    `;
    skinsList.appendChild(skinItem);
}

function saveCaseSkins() {
    alert('Состав кейса сохранен!');
}

function clearCaseSkins() {
    document.getElementById('case-skins-list').innerHTML = `
        <i class="fas fa-arrow-left"></i>
        <p>Перетащите сюда скины из левой колонки</p>
        <small>Укажите шанс выпадения (1-100) при перетаскивании</small>
    `;
}

function selectSkin(skinId) {
    // Логика выбора скина
    console.log('Выбран скин:', skinId);
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