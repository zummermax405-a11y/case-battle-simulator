const SUPABASE_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SUPABASE_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null, selectedCaseId = null, draggedSkinId = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    updateUI();
    loadCases();
    if(user) { loadInventory(); loadWithdrawals(); }
    showSection('cases-section');
}

function updateUI() {
    const userEmail = document.getElementById('user-email'),
          authBtn = document.getElementById('auth-btn'),
          logoutBtn = document.getElementById('logout-btn'),
          adminBtn = document.getElementById('admin-btn'),
          balance = document.getElementById('balance'),
          inventoryCount = document.getElementById('inventory-count');
    
    if(currentUser) {
        userEmail.textContent = currentUser.email;
        authBtn.style.display = 'none';
        logoutBtn.style.display = 'flex';
        adminBtn.style.display = currentUser.email.includes('admin') ? 'flex' : 'none';
        balance.textContent = '1000';
        loadUserData();
    } else {
        userEmail.textContent = 'Гость';
        authBtn.style.display = 'flex';
        logoutBtn.style.display = 'none';
        adminBtn.style.display = 'none';
        if(balance) balance.textContent = '0';
        if(inventoryCount) inventoryCount.textContent = '0';
    }
}

async function loadUserData() {
    // Здесь должна быть загрузка данных пользователя
}

async function loadCases() {
    const container = document.getElementById('cases');
    if(!container) return;
    
    const testCases = [
        { id: 1, name: 'Базовый кейс', price: 100, items: 5 },
        { id: 2, name: 'Премиум кейс', price: 500, items: 10 },
        { id: 3, name: 'Легендарный кейс', price: 1000, items: 15 }
    ];
    
    container.innerHTML = '';
    testCases.forEach(c => {
        const card = document.createElement('div');
        card.className = 'case-card';
        card.innerHTML = `
            <div class="case-icon"><i class="fas fa-box"></i></div>
            <div class="case-name">${c.name}</div>
            <div class="case-price">${c.price} ₽</div>
            <div class="case-stats"><span>${c.items} предметов</span><span><i class="fas fa-fire"></i> Популярный</span></div>
        `;
        card.onclick = () => previewCase(c.id);
        container.appendChild(card);
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.main-section').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    const section = document.getElementById(sectionId);
    const activeBtn = Array.from(document.querySelectorAll('.nav-btn')).find(b => 
        b.getAttribute('onclick')?.includes(sectionId)
    );
    
    if(section) section.classList.add('active');
    if(activeBtn) activeBtn.classList.add('active');
    
    if(sectionId === 'inventory-section') loadInventory();
    if(sectionId === 'withdrawals-section') loadWithdrawals();
}

function showAuth() {
    const modal = document.getElementById('auth-modal');
    if(modal) modal.style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if(modal) modal.style.display = 'none';
}

async function login() {
    const email = document.getElementById('email')?.value,
          password = document.getElementById('password')?.value,
          error = document.getElementById('auth-error');
    
    if(!email || !password) {
        if(error) error.textContent = 'Заполните все поля';
        return;
    }
    
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    
    if(authError) {
        if(error) error.textContent = 'Ошибка входа: ' + authError.message;
        return;
    }
    
    currentUser = data.user;
    closeModal('auth-modal');
    updateUI();
    loadCases();
    loadInventory();
}

async function register() {
    const email = document.getElementById('email')?.value,
          password = document.getElementById('password')?.value,
          error = document.getElementById('auth-error');
    
    if(!email || !password) {
        if(error) error.textContent = 'Заполните все поля';
        return;
    }
    
    if(password.length < 6) {
        if(error) error.textContent = 'Пароль должен быть не менее 6 символов';
        return;
    }
    
    const { data, error: authError } = await supabase.auth.signUp({ email, password });
    
    if(authError) {
        if(error) error.textContent = 'Ошибка регистрации: ' + authError.message;
        return;
    }
    
    if(error) error.textContent = 'Регистрация успешна! Проверьте почту.';
    setTimeout(() => {
        closeModal('auth-modal');
        const emailInput = document.getElementById('email'),
              passInput = document.getElementById('password');
        if(emailInput) emailInput.value = '';
        if(passInput) passInput.value = '';
    }, 2000);
}

async function logout() {
    await supabase.auth.signOut();
    currentUser = null;
    updateUI();
    showSection('cases-section');
}

function previewCase(caseId) {
    selectedCaseId = caseId;
    const title = document.getElementById('preview-title'),
          price = document.getElementById('preview-price'),
          items = document.getElementById('preview-items'),
          modal = document.getElementById('preview-modal');
    
    if(title) title.textContent = 'Базовый кейс';
    if(price) price.textContent = '100';
    
    if(items) {
        items.innerHTML = '';
        const testItems = [
            { name: 'Обычный нож', chance: 40 },
            { name: 'Редкий пистолет', chance: 25 },
            { name: 'Эпическая винтовка', chance: 15 }
        ];
        testItems.forEach(item => {
            const el = document.createElement('div');
            el.className = 'preview-item';
            el.innerHTML = `<i class="fas fa-gem"></i><div class="preview-item-name">${item.name}</div><div class="preview-item-chance">${item.chance}%</div>`;
            items.appendChild(el);
        });
    }
    
    if(modal) modal.style.display = 'flex';
}

function openCase() {
    if(!currentUser) {
        alert('Войдите в систему для открытия кейсов');
        return;
    }
    alert('Кейс открыт! Вы получили: Обычный нож');
    closeModal('preview-modal');
}

async function loadInventory() {
    const list = document.getElementById('inventory-list'),
          total = document.getElementById('inventory-total'),
          value = document.getElementById('inventory-value'),
          count = document.getElementById('inventory-count');
    
    if(!list) return;
    
    if(!currentUser) {
        list.innerHTML = '<div class="empty-state"><i class="fas fa-box-open"></i><p>Войдите в систему</p></div>';
        return;
    }
    
    const testItems = [
        { name: 'Обычный нож', price: 50 },
        { name: 'Редкий пистолет', price: 200 }
    ];
    
    list.innerHTML = '';
    let totalValue = 0;
    
    testItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'skin-card';
        card.innerHTML = `
            <div class="skin-icon"><i class="fas fa-gem"></i></div>
            <div class="skin-info"><div class="skin-name">${item.name}</div><div class="skin-price">${item.price} ₽</div></div>
        `;
        list.appendChild(card);
        totalValue += item.price;
    });
    
    if(total) total.textContent = testItems.length;
    if(value) value.textContent = totalValue;
    if(count) count.textContent = testItems.length;
}

function showWithdraw() {
    if(!currentUser) {
        alert('Войдите в систему для вывода средств');
        return;
    }
    const balance = document.getElementById('withdraw-balance'),
          modal = document.getElementById('withdraw-modal');
    if(balance) balance.textContent = document.getElementById('balance')?.textContent || '0';
    if(modal) modal.style.display = 'flex';
}

async function createWithdraw() {
    const amount = document.getElementById('withdraw-amount')?.value,
          tg = document.getElementById('withdraw-tg')?.value;
    
    if(!amount || !tg) {
        alert('Заполните все поля');
        return;
    }
    
    if(parseInt(amount) < 1000) {
        alert('Минимальная сумма вывода: 1000 ₽');
        return;
    }
    
    alert(`Заявка на вывод ${amount} ₽ создана! Мы свяжемся в Telegram: ${tg}`);
    closeModal('withdraw-modal');
    loadWithdrawals();
}

async function loadWithdrawals() {
    const history = document.getElementById('withdrawals-history'),
          pending = document.getElementById('pending-withdrawals'),
          completed = document.getElementById('completed-withdrawals'),
          total = document.getElementById('total-withdrawn');
    
    if(!history) return;
    
    if(!currentUser) {
        history.innerHTML = '<div class="empty-state"><i class="fas fa-file-invoice-dollar"></i><p>Войдите в систему</p></div>';
        return;
    }
    
    const testWithdrawals = [
        { id: 1, amount: 1500, status: 'completed', date: '2024-01-15', tg: '@user1' },
        { id: 2, amount: 2000, status: 'pending', date: '2024-01-16', tg: '@user1' }
    ];
    
    history.innerHTML = '';
    testWithdrawals.forEach(w => {
        const item = document.createElement('div');
        item.className = `withdrawal-item withdrawal-${w.status}`;
        item.innerHTML = `
            <div class="withdrawal-info">
                <h4>Заявка #${w.id}</h4><p>${w.date} • ${w.tg}</p><p>Статус: ${w.status === 'completed' ? 'Выполнена' : 'В обработке'}</p>
            </div>
            <div class="withdrawal-amount">${w.amount} ₽</div>
        `;
        history.appendChild(item);
    });
    
    const pendingCount = testWithdrawals.filter(w => w.status === 'pending').length,
          completedCount = testWithdrawals.filter(w => w.status === 'completed').length,
          totalAmount = testWithdrawals.filter(w => w.status === 'completed').reduce((s, w) => s + w.amount, 0);
    
    if(pending) pending.textContent = pendingCount;
    if(completed) completed.textContent = completedCount;
    if(total) total.textContent = totalAmount;
}

function adminPanel() {
    if(!currentUser) return;
    const modal = document.getElementById('admin-modal');
    if(modal) modal.style.display = 'flex';
    loadAdminCases();
    loadAdminSkins();
}

function loadAdminCases() {
    const list = document.getElementById('admin-cases-list');
    if(list) list.innerHTML = '<div class="admin-item">Базовый кейс (100 ₽)</div>';
}

function loadAdminSkins() {
    const list = document.getElementById('admin-skins-list');
    if(list) list.innerHTML = `
        <div class="admin-item" draggable="true" ondragstart="dragSkin(event,1)"><div class="admin-item-header"><span>Обычный нож</span><span>50 ₽</span></div></div>
        <div class="admin-item" draggable="true" ondragstart="dragSkin(event,2)"><div class="admin-item-header"><span>Редкий пистолет</span><span>200 ₽</span></div></div>
    `;
}

function createNewCase() {
    const name = document.getElementById('new-case-name')?.value,
          price = document.getElementById('new-case-price')?.value;
    if(!name || !price) { alert('Заполните все поля'); return; }
    alert(`Кейс "${name}" создан!`);
    document.getElementById('new-case-name').value = '';
    document.getElementById('new-case-price').value = '';
}

function createNewSkin() {
    const name = document.getElementById('new-skin-name')?.value,
          price = document.getElementById('new-skin-price')?.value;
    if(!name || !price) { alert('Заполните все поля'); return; }
    alert(`Скин "${name}" создан!`);
    document.getElementById('new-skin-name').value = '';
    document.getElementById('new-skin-price').value = '100';
}

function dragSkin(e, id) {
    draggedSkinId = id;
    e.dataTransfer.setData('text/plain', id);
}

function allowDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
}

function dragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
}

function dropOnCase(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const skinId = e.dataTransfer.getData('text/plain');
    if(!skinId) return;
    const chance = prompt('Укажите шанс выпадения (1-100):', '50');
    if(!chance || isNaN(chance) || chance < 1 || chance > 100) {
        alert('Введите корректный шанс (1-100)');
        return;
    }
    const list = document.getElementById('case-skins-list');
    if(list) {
        const item = document.createElement('div');
        item.className = 'case-skin-item';
        item.innerHTML = `<span>Скин #${skinId} (шанс: ${chance}%)</span><input type="number" class="chance-input" value="${chance}" min="1" max="100">`;
        list.appendChild(item);
    }
}

function saveCaseSkins() { alert('Состав кейса сохранен!'); }
function clearCaseSkins() {
    const list = document.getElementById('case-skins-list');
    if(list) list.innerHTML = '<i class="fas fa-arrow-left"></i><p>Перетащите скины</p><small>Укажите шанс</small>';
}

window.onclick = function(e) {
    document.querySelectorAll('.modal').forEach(m => {
        if(e.target === m) m.style.display = 'none';
    });
};