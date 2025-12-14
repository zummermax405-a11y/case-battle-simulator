// ================================
// КОНФИГУРАЦИЯ И ПЕРЕМЕННЫЕ
// ================================

// Конфигурация Cloudflare Worker
const WORKER_URL = 'https://mute-night-5909.zummer-max405.workers.dev'; // ЗАМЕНИТЕ НА ВАШ URL!

// Глобальное состояние игры
let gameState = {
    player: null,
    balance: 0,
    inventory: [],
    casesOpened: 0,
    lastBonusTime: null
};

// Данные из базы
let virtualSkins = [];
let cases = [];

// Текущий выбранный кейс
let selectedCaseForOpening = null;
let isRouletteSpinning = false;

// ================================
// УТИЛИТЫ И ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ================================

// Показать уведомление
function showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, duration);
}

// Форматирование чисел
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Получение названия редкости
function getRarityName(rarity) {
    const names = {
        common: "Обычный",
        uncommon: "Необычный",
        rare: "Редкий",
        epic: "Эпический",
        legendary: "Легендарный"
    };
    return names[rarity] || rarity;
}

// Обновление интерфейса
function updateUI() {
    const balanceElem = document.getElementById('balance');
    const balanceStatus = document.getElementById('balance-status');
    
    if (balanceElem) {
        balanceElem.textContent = formatNumber(gameState.balance);
        balanceElem.className = 'stat-value ' + 
            (gameState.balance < 1000 ? 'low' : 
             gameState.balance > 50000 ? 'high' : '');
    }
    
    if (balanceStatus) {
        balanceStatus.textContent = gameState.balance < 1000 ? 
            'минимальный вывод: 1000' : 'монет';
    }
    
    const inventoryCount = document.getElementById('inventory-count');
    if (inventoryCount) {
        inventoryCount.textContent = gameState.inventory.length;
    }
    
    const casesOpened = document.getElementById('cases-opened');
    if (casesOpened) {
        casesOpened.textContent = gameState.casesOpened;
    }
}

// Обновить все данные
async function refreshAllData() {
    try {
        showNotification('Обновление данных...', 'info');
        
        // Обновляем баланс через Worker
        if (gameState.player) {
            const response = await fetch(`${WORKER_URL}/api/get-balance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    player_id: gameState.player.device_id
                })
            });
            
            const result = await response.json();
            if (result.balance !== undefined) {
                gameState.balance = result.balance;
            }
        }
        
        // Обновляем инвентарь
        if (gameState.player) {
            gameState.inventory = await window.supabaseClient.getPlayerInventory(gameState.player.device_id);
        }
        
        updateUI();
        renderInventory();
        showNotification('Данные обновлены!', 'success');
        
    } catch (error) {
        console.error('Ошибка обновления:', error);
        showNotification('Ошибка обновления', 'error');
    }
}

// ================================
// ИНИЦИАЛИЗАЦИЯ И ЗАГРУЗКА
// ================================

// Инициализация игры
async function initGame() {
    console.log('🚀 Инициализация игры...');
    
    try {
        // 1. Загружаем статические данные
        await loadDataFromSupabase();
        
        // 2. Получаем или создаем игрока
        gameState.player = await window.supabaseClient.getOrCreatePlayer();
        if (gameState.player) {
            gameState.balance = gameState.player.balance;
            gameState.inventory = await window.supabaseClient.getPlayerInventory(gameState.player.device_id);
        }
        
        // 3. Рендерим интерфейс
        updateUI();
        renderCases();
        renderInventory();
        checkAdminStatus();
        updateBonusTimer();
        
        // 4. Запускаем обновление баланса каждые 30 секунд
        setInterval(() => refreshBalance(), 30000);
        
        // 5. Запускаем таймер бонуса
        setInterval(updateBonusTimer, 1000);
        
        console.log('✅ Игра инициализирована', gameState);
        showNotification('Игра загружена!', 'success');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
        showNotification('Ошибка загрузки игры', 'error');
    }
}

// Загрузка данных из Supabase
async function loadDataFromSupabase() {
    try {
        const [skinsData, casesData] = await Promise.all([
            window.supabaseClient.getSkinsFromDB(),
            window.supabaseClient.getCasesFromDB()
        ]);
        
        virtualSkins = skinsData;
        cases = casesData.map(dbCase => ({
            id: dbCase.id,
            name: dbCase.name,
            price: dbCase.price,
            emoji: dbCase.emoji,
            description: dbCase.description,
            color: dbCase.color,
            drops: (dbCase.case_items || []).map(item => ({
                skinId: item.skins?.id,
                chance: item.chance
            })).filter(drop => drop.skinId)
        }));
        
    } catch (error) {
        console.error('Ошибка загрузки:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
}

// Обновить баланс
async function refreshBalance() {
    if (!gameState.player) return;
    
    try {
        const response = await fetch(`${WORKER_URL}/api/get-balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: gameState.player.device_id
            })
        });
        
        const result = await response.json();
        if (result.balance !== undefined && result.balance !== gameState.balance) {
            gameState.balance = result.balance;
            updateUI();
        }
    } catch (error) {
        console.error('Ошибка обновления баланса:', error);
    }
}

// ================================
// КЕЙСЫ И ПРЕДПРОСМОТР
// ================================

// Рендер кейсов
function renderCases() {
    const container = document.getElementById('cases-container');
    if (!container || cases.length === 0) return;
    
    container.innerHTML = '';
    
    cases.forEach(cs => {
        const caseElement = document.createElement('div');
        caseElement.className = `case-item ${gameState.balance < cs.price ? 'disabled' : ''}`;
        caseElement.onclick = () => previewCase(cs.id);
        
        const canAfford = gameState.balance >= cs.price;
        
        caseElement.innerHTML = `
            <div class="case-image" style="background: ${cs.color || '#4361ee'}">
                ${cs.emoji || '📦'}
            </div>
            <h3>${cs.name}</h3>
            <p class="case-price">${cs.price} монет</p>
            <p class="case-description">${cs.description || 'Нажмите для просмотра'}</p>
            <p class="case-rarity">
                ${canAfford ? '✅ Доступен для открытия' : '❌ Недостаточно средств'}
            </p>
        `;
        
        container.appendChild(caseElement);
    });
}

// Предпросмотр кейса
async function previewCase(caseId) {
    const selectedCase = cases.find(c => c.id === caseId);
    if (!selectedCase) return;
    
    selectedCaseForOpening = selectedCase;
    
    // Заполняем модальное окно
    document.getElementById('preview-title').textContent = selectedCase.name;
    document.getElementById('preview-description').textContent = selectedCase.description;
    document.getElementById('preview-price').textContent = selectedCase.price;
    document.getElementById('preview-balance').textContent = gameState.balance;
    
    // Очищаем и заполняем контейнер скинов
    const container = document.getElementById('preview-items-container');
    container.innerHTML = '';
    
    let totalChance = selectedCase.drops.reduce((sum, drop) => sum + drop.chance, 0);
    
    selectedCase.drops.forEach(drop => {
        const skin = virtualSkins.find(s => s.id === drop.skinId);
        if (!skin) return;
        
        const chancePercent = totalChance > 0 ? ((drop.chance / totalChance) * 100).toFixed(1) : '0';
        
        const item = document.createElement('div');
        item.className = `preview-item skin-${skin.rarity}`;
        item.innerHTML = `
            <div style="font-size: 2em;">${skin.emoji}</div>
            <div class="skin-name">${skin.name}</div>
            <div class="skin-rarity" style="color: ${skin.color}">
                ${getRarityName(skin.rarity)}
            </div>
            <div class="skin-value">${skin.value} монет</div>
            <div class="skin-chance">Шанс: ${chancePercent}%</div>
        `;
        container.appendChild(item);
    });
    
    // Настраиваем кнопку открытия
    const openBtn = document.getElementById('open-case-btn');
    if (gameState.balance >= selectedCase.price) {
        openBtn.style.display = 'block';
        openBtn.disabled = false;
        openBtn.className = 'btn btn-primary';
        openBtn.innerHTML = `🎰 Открыть за ${selectedCase.price} монет`;
    } else {
        openBtn.style.display = 'block';
        openBtn.disabled = true;
        openBtn.className = 'btn btn-secondary';
        openBtn.innerHTML = `❌ Недостаточно монет (нужно: ${selectedCase.price})`;
    }
    
    document.getElementById('preview-modal').style.display = 'block';
}

function closePreview() {
    document.getElementById('preview-modal').style.display = 'none';
    selectedCaseForOpening = null;
}

// ================================
// ОТКРЫТИЕ КЕЙСОВ И РУЛЕТКА
// ================================

async function openCaseFromPreview() {
    if (!selectedCaseForOpening || !gameState.player) return;
    
    if (gameState.balance < selectedCaseForOpening.price) {
        showNotification('Недостаточно монет!', 'error');
        return;
    }
    
    if (isRouletteSpinning) return;
    isRouletteSpinning = true;
    
    try {
        // Отправляем запрос на открытие кейса через Worker
        showNotification('Открываем кейс...', 'info');
        
        const response = await fetch(`${WORKER_URL}/api/open-case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: gameState.player.device_id,
                case_id: selectedCaseForOpening.id,
                case_price: selectedCaseForOpening.price
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Обновляем баланс
            gameState.balance = result.newBalance;
            gameState.casesOpened++;
            
            // Запускаем анимацию рулетки
            await startRouletteAnimation(result.wonSkin, result.wonSkinValue);
            
            // Обновляем инвентарь
            gameState.inventory = await window.supabaseClient.getPlayerInventory(gameState.player.device_id);
            
            updateUI();
            renderInventory();
            
        } else {
            throw new Error(result.error || 'Ошибка открытия кейса');
        }
        
    } catch (error) {
        console.error('Ошибка открытия кейса:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    } finally {
        isRouletteSpinning = false;
    }
}

// Анимация рулетки
async function startRouletteAnimation(wonSkinId, wonSkinValue) {
    const wonSkin = virtualSkins.find(s => s.id === wonSkinId);
    if (!wonSkin) return;
    
    const modal = document.getElementById('roulette-modal');
    const track = document.getElementById('roulette-track');
    const resultDiv = document.getElementById('roulette-result');
    const closeBtn = document.querySelector('.btn-close-roulette');
    
    modal.style.display = 'block';
    resultDiv.style.display = 'none';
    closeBtn.style.display = 'none';
    
    // Создаем трек для рулетки
    track.innerHTML = '';
    const itemsToShow = 20; // Количество элементов в рулетке
    
    for (let i = 0; i < itemsToShow; i++) {
        const randomSkin = virtualSkins[Math.floor(Math.random() * virtualSkins.length)];
        const item = document.createElement('div');
        item.className = 'roulette-item';
        item.innerHTML = `
            <div class="roulette-emoji">${randomSkin.emoji}</div>
            <div class="roulette-item-name">${randomSkin.name}</div>
            <div class="roulette-item-value">${randomSkin.value}</div>
        `;
        track.appendChild(item);
    }
    
    // Добавляем выигранный скин в конец
    const wonItem = document.createElement('div');
    wonItem.className = 'roulette-item highlighted';
    wonItem.innerHTML = `
        <div class="roulette-emoji">${wonSkin.emoji}</div>
        <div class="roulette-item-name">${wonSkin.name}</div>
        <div class="roulette-item-value">${wonSkin.value}</div>
    `;
    track.appendChild(wonItem);
    
    // Анимация прокрутки
    const itemWidth = 180;
    const totalWidth = (itemsToShow + 1) * itemWidth;
    const targetPosition = -(totalWidth - 900); // Останавливаем на выигранном
    
    let startTime = null;
    const duration = 3000; // 3 секунды
    
    function animate(currentTime) {
        if (!startTime) startTime = currentTime;
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing функция для плавного замедления
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentPosition = targetPosition * easeOut;
        
        track.style.transform = `translateX(${currentPosition}px)`;
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            // Показываем результат
            resultDiv.innerHTML = `
                <h3 style="color: ${wonSkin.color}">🎉 ВЫ ВЫИГРАЛИ!</h3>
                <p><span style="font-size: 2em">${wonSkin.emoji}</span></p>
                <p><strong>${wonSkin.name}</strong></p>
                <p>Редкость: <span style="color: ${wonSkin.color}">${getRarityName(wonSkin.rarity)}</span></p>
                <p>Ценность: ${wonSkin.value} монет</p>
            `;
            resultDiv.style.display = 'block';
            closeBtn.style.display = 'block';
            showNotification(`Вы выиграли: ${wonSkin.name} (${wonSkin.value} монет)!`, 'success');
        }
    }
    
    requestAnimationFrame(animate);
}

function closeRoulette() {
    document.getElementById('roulette-modal').style.display = 'none';
    closePreview();
}

// ================================
// ИНВЕНТАРЬ И ПРОДАЖА СКИНОВ
// ================================

async function renderInventory() {
    const container = document.getElementById('inventory-container');
    if (!container) return;
    
    if (gameState.inventory.length === 0) {
        container.innerHTML = '<p class="empty-inventory">Ваш инвентарь пуст. Откройте кейсы, чтобы получить предметы!</p>';
        return;
    }
    
    container.innerHTML = '';
    
    // Сортируем по редкости
    const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
    const sortedInventory = [...gameState.inventory].sort((a, b) => {
        const skinA = a.skins || virtualSkins.find(s => s.id === a.skin_id) || {};
        const skinB = b.skins || virtualSkins.find(s => s.id === b.skin_id) || {};
        return rarityOrder[skinB.rarity] - rarityOrder[skinA.rarity];
    });
    
    sortedInventory.forEach((item) => {
        const skin = item.skins || virtualSkins.find(s => s.id === item.skin_id) || {};
        const sellPrice = Math.floor((skin.value || 0) * 0.7);
        
        const skinElement = document.createElement('div');
        skinElement.className = `skin-card skin-${skin.rarity}`;
        
        skinElement.innerHTML = `
            <div class="skin-icon">${skin.emoji || '🔫'}</div>
            <div class="skin-name">${skin.name || 'Неизвестный предмет'}</div>
            <div class="skin-rarity" style="color: ${skin.color || '#B0B0B0'}">
                ${getRarityName(skin.rarity)}
            </div>
            <div class="skin-value">${skin.value || 0} монет</div>
            <button class="btn-sell" onclick="sellSkin('${item.id}', ${skin.id}, ${sellPrice}, '${skin.name.replace(/'/g, "\\'")}')">
                💰 Продать за ${sellPrice} монет
            </button>
        `;
        
        container.appendChild(skinElement);
    });
}

async function sellSkin(inventoryId, skinId, sellPrice, skinName) {
    if (!gameState.player || !confirm(`Продать "${skinName}" за ${sellPrice} монет? (70% от стоимости)`)) {
        return;
    }
    
    try {
        showNotification('Продаем скин...', 'info');
        
        const response = await fetch(`${WORKER_URL}/api/sell-skin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: gameState.player.device_id,
                inventory_id: inventoryId,
                skin_id: skinId
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Обновляем баланс
            gameState.balance = result.newBalance;
            
            // Удаляем скин из инвентаря
            gameState.inventory = gameState.inventory.filter(item => item.id !== inventoryId);
            
            updateUI();
            renderInventory();
            
            showNotification(`Скин продан за ${sellPrice} монет! Новый баланс: ${result.newBalance}`, 'success');
            
        } else {
            throw new Error(result.error || 'Ошибка продажи');
        }
        
    } catch (error) {
        console.error('Ошибка продажи:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

async function sellAllSkins() {
    if (!gameState.player || gameState.inventory.length === 0) {
        showNotification('В инвентаре нет скинов для продажи', 'info');
        return;
    }
    
    const totalValue = gameState.inventory.reduce((sum, item) => {
        const skin = item.skins || virtualSkins.find(s => s.id === item.skin_id) || {};
        return sum + (skin.value || 0);
    }, 0);
    
    const totalSellPrice = Math.floor(totalValue * 0.7);
    
    if (!confirm(`Продать ВСЕ скины (${gameState.inventory.length} шт.) за ${totalSellPrice} монет?`)) {
        return;
    }
    
    try {
        showNotification('Продаем все скины...', 'info');
        
        const response = await fetch(`${WORKER_URL}/api/sell-all-skins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: gameState.player.device_id
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Обновляем баланс
            gameState.balance = result.newBalance;
            gameState.inventory = [];
            
            updateUI();
            renderInventory();
            
            showNotification(`Все скины проданы за ${totalSellPrice} монет!`, 'success');
            
        } else {
            throw new Error(result.error || 'Ошибка массовой продажи');
        }
        
    } catch (error) {
        console.error('Ошибка массовой продажи:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

function sortInventory(by) {
    if (!gameState.inventory.length) return;
    
    switch (by) {
        case 'rarity':
            const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
            gameState.inventory.sort((a, b) => {
                const skinA = a.skins || virtualSkins.find(s => s.id === a.skin_id) || {};
                const skinB = b.skins || virtualSkins.find(s => s.id === b.skin_id) || {};
                return rarityOrder[skinB.rarity] - rarityOrder[skinA.rarity];
            });
            break;
            
        case 'value':
            gameState.inventory.sort((a, b) => {
                const skinA = a.skins || virtualSkins.find(s => s.id === a.skin_id) || {};
                const skinB = b.skins || virtualSkins.find(s => s.id === b.skin_id) || {};
                return (skinB.value || 0) - (skinA.value || 0);
            });
            break;
            
        case 'newest':
            gameState.inventory.sort((a, b) => {
                return new Date(b.obtained_at) - new Date(a.obtained_at);
            });
            break;
    }
    
    renderInventory();
}

// ================================
// ВЫВОД БАЛАНСА
// ================================

function showWithdrawalModal() {
    if (gameState.balance < 1000) {
        showNotification(`Минимальная сумма для вывода: 1000 монет\nВаш баланс: ${gameState.balance} монет`, 'error');
        return;
    }
    
    const modal = document.getElementById('withdrawal-modal');
    const amountInput = document.getElementById('withdrawal-amount');
    const telegramInput = document.getElementById('withdrawal-telegram');
    
    const maxAmount = Math.floor(gameState.balance / 1000) * 1000;
    const currentAmount = Math.min(1000, maxAmount);
    
    amountInput.max = maxAmount;
    amountInput.value = currentAmount;
    
    document.getElementById('withdrawal-max').textContent = maxAmount;
    document.getElementById('withdrawal-balance').textContent = gameState.balance;
    document.getElementById('amount-value').textContent = currentAmount;
    
    telegramInput.value = '@zummer_pro';
    
    modal.style.display = 'block';
}

function updateWithdrawalAmount(value) {
    document.getElementById('amount-value').textContent = value;
}

function closeWithdrawalModal() {
    document.getElementById('withdrawal-modal').style.display = 'none';
}

async function submitWithdrawalRequest() {
    const amount = parseInt(document.getElementById('withdrawal-amount').value);
    const telegram = document.getElementById('withdrawal-telegram').value.trim();
    
    if (!gameState.player) {
        showNotification('Ошибка: игрок не найден', 'error');
        return;
    }
    
    if (amount < 1000 || amount > gameState.balance) {
        showNotification('Неверная сумма для вывода', 'error');
        return;
    }
    
    if (!telegram || !telegram.includes('@')) {
        showNotification('Введите корректный Telegram контакт (например, @username)', 'error');
        return;
    }
    
    try {
        showNotification('Создаем заявку на вывод...', 'info');
        
        // 1. Создаем заявку в базе
        const { data: request, error } = await supabase
            .from('withdrawal_requests')
            .insert([{
                player_id: gameState.player.device_id,
                amount: amount,
                telegram_contact: telegram,
                status: 'pending'
            }])
            .select()
            .single();
        
        if (error) throw error;
        
        // 2. Списываем баланс через Worker
        const adminToken = localStorage.getItem('admin_token') || prompt('Для вывода нужен админ-токен:');
        if (!adminToken) {
            showNotification('Отменено: требуется админ-токен', 'error');
            return;
        }
        
        const response = await fetch(`${WORKER_URL}/api/process-withdrawal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                request_id: request.id,
                action: 'approve'
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Обновляем баланс
            gameState.balance = result.newBalance;
            updateUI();
            
            showNotification(`✅ Заявка #${request.id} создана!\nСумма ${amount} списана\nАдмин свяжется: ${telegram}`, 'success', 5000);
            closeWithdrawalModal();

                    } else {
            throw new Error(result.error || 'Ошибка списания баланса');
        }
        
    } catch (error) {
        console.error('Ошибка создания заявки:', error);
        showNotification('Ошибка: ' + error.message, 'error', 5000);
        
        // Если ошибка при списании, меняем статус заявки на "ошибка"
        try {
            await supabase
                .from('withdrawal_requests')
                .update({ status: 'error', admin_notes: error.message })
                .eq('id', request?.id);
        } catch (updateError) {
            console.error('Ошибка обновления статуса:', updateError);
        }
    }
}



// ================================
// БОНУСЫ И ТАЙМЕРЫ
// ================================

function updateBonusTimer() {
    const timerElement = document.getElementById('bonus-timer');
    if (!timerElement) return;
    
    const now = new Date().getTime();
    const lastBonus = gameState.lastBonusTime ? new Date(gameState.lastBonusTime).getTime() : 0;
    const cooldown = 60 * 60 * 1000; // 1 час
    const timeLeft = cooldown - (now - lastBonus);
    
    if (timeLeft <= 0) {
        timerElement.textContent = 'Готово';
        timerElement.style.color = '#00b894';
    } else {
        const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
        timerElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        timerElement.style.color = '#f72585';
    }
}

async function claimHourlyBonus() {
    const now = new Date();
    const lastBonus = gameState.lastBonusTime ? new Date(gameState.lastBonusTime) : null;
    
    if (lastBonus && (now - lastBonus) < 60 * 60 * 1000) {
        const minutesLeft = 60 - Math.floor((now - lastBonus) / (60 * 1000));
        showNotification(`Бонус можно получить через ${minutesLeft} минут`, 'info');
        return;
    }
    
    try {
        const bonusAmount = Math.floor(Math.random() * 500) + 500; // 500-1000 монет
        
        // Обновляем баланс через Worker
        const response = await fetch(`${WORKER_URL}/api/add-bonus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: gameState.player.device_id,
                amount: bonusAmount
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            gameState.balance = result.newBalance;
            gameState.lastBonusTime = now.toISOString();
            
            updateUI();
            updateBonusTimer();
            
            showNotification(`🎁 Получен бонус: ${bonusAmount} монет!`, 'success');
            
        } else {
            throw new Error(result.error || 'Ошибка получения бонуса');
        }
        
    } catch (error) {
        console.error('Ошибка получения бонуса:', error);
        showNotification('Ошибка получения бонуса', 'error');
    }
}

// ================================
// АДМИН-ПАНЕЛЬ
// ================================

function checkAdminStatus() {
    const adminSection = document.getElementById('admin-section');
    const isAdmin = window.supabaseClient.isAdminLoggedIn();
    
    if (adminSection) {
        adminSection.style.display = isAdmin ? 'flex' : 'none';
    }
}

function showAdminPanel() {
    if (!window.supabaseClient.isAdminLoggedIn()) {
        showAdminLoginModal();
        return;
    }
    
    document.getElementById('admin-panel-modal').style.display = 'block';
    loadAdminData();
}

function showAdminLoginModal() {
    document.getElementById('admin-login-modal').style.display = 'block';
}

function closeAdminPanel() {
    document.getElementById('admin-panel-modal').style.display = 'none';
}

async function performAdminLogin() {
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    const errorElement = document.getElementById('login-error');
    
    if (!username || !password) {
        errorElement.textContent = 'Заполните все поля';
        return;
    }
    
    try {
        const result = await window.supabaseClient.adminLogin(username, password);
        
        if (result.success) {
            document.getElementById('admin-login-modal').style.display = 'none';
            checkAdminStatus();
            showAdminPanel();
            showNotification('Вход выполнен успешно!', 'success');
        } else {
            errorElement.textContent = result.message || 'Неверные данные';
        }
    } catch (error) {
        errorElement.textContent = 'Ошибка авторизации';
        console.error('Ошибка входа админа:', error);
    }
}

function adminLogout() {
    window.supabaseClient.adminLogout();
    checkAdminStatus();
    showNotification('Выход выполнен', 'info');
}

async function loadAdminData() {
    if (!window.supabaseClient.isAdminLoggedIn()) return;
    
    try {
        // Загружаем заявки на вывод
        const requests = await window.supabaseClient.getWithdrawalRequests();
        renderWithdrawalRequests(requests);
        
        // Обновляем статистику
        updateAdminStats(requests);
        
    } catch (error) {
        console.error('Ошибка загрузки админ-данных:', error);
        showNotification('Ошибка загрузки данных админ-панели', 'error');
    }
}

function updateAdminStats(requests) {
    const totalRequests = requests.length;
    const pendingRequests = requests.filter(r => r.status === 'pending').length;
    const totalAmount = requests.reduce((sum, r) => sum + r.amount, 0);
    
    document.getElementById('total-requests').textContent = totalRequests;
    document.getElementById('pending-requests').textContent = pendingRequests;
    document.getElementById('total-amount').textContent = formatNumber(totalAmount);
}

function renderWithdrawalRequests(requests) {
    const container = document.getElementById('admin-withdrawal-requests');
    if (!container) return;
    
    if (requests.length === 0) {
        container.innerHTML = '<p class="empty-inventory">Нет заявок на вывод</p>';
        return;
    }
    
    let html = `
        <table class="admin-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Игрок</th>
                    <th>Сумма</th>
                    <th>Telegram</th>
                    <th>Статус</th>
                    <th>Дата</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    requests.forEach(request => {
        const date = new Date(request.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        const playerId = request.players?.device_id || 'N/A';
        const shortPlayerId = playerId.substring(0, 8) + '...';
        
        html += `
            <tr>
                <td>#${request.id}</td>
                <td title="${playerId}">${shortPlayerId}</td>
                <td>${formatNumber(request.amount)}</td>
                <td>${request.telegram_contact}</td>
                <td>
                    <span class="request-status status-${request.status}">
                        ${getRequestStatusName(request.status)}
                    </span>
                </td>
                <td>${date}</td>
                <td>
        `;
        
        if (request.status === 'pending') {
            html += `
                <button class="btn-action btn-approve" onclick="processWithdrawalRequest(${request.id}, 'approve')">
                    ✅ Одобрить
                </button>
                <button class="btn-action btn-reject" onclick="processWithdrawalRequest(${request.id}, 'reject')">
                    ❌ Отклонить
                </button>
            `;
        } else {
            html += `
                <span class="btn-action btn-completed">
                    ${request.status === 'approved' ? '✅ Выполнено' : '❌ Отклонено'}
                </span>
            `;
        }
        
        html += `
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

function getRequestStatusName(status) {
    const names = {
        pending: 'Ожидает',
        approved: 'Одобрено',
        rejected: 'Отклонено',
        error: 'Ошибка'
    };
    return names[status] || status;
}

async function processWithdrawalRequest(requestId, action) {
    if (!window.supabaseClient.isAdminLoggedIn()) {
        showNotification('Требуется авторизация админа', 'error');
        return;
    }
    
    const confirmMessage = action === 'approve' 
        ? 'Одобрить эту заявку на вывод?'
        : 'Отклонить эту заявку?';
    
    if (!confirm(confirmMessage)) return;
    
    try {
        // Получаем токен админа
        const adminToken = localStorage.getItem('admin_token') || 
                          prompt('Введите админ-токен для подтверждения:');
        
        if (!adminToken) {
            showNotification('Отменено: требуется токен', 'info');
            return;
        }
        
        showNotification('Обрабатываем заявку...', 'info');
        
        const response = await fetch(`${WORKER_URL}/api/process-withdrawal`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${adminToken}`
            },
            body: JSON.stringify({
                request_id: requestId,
                action: action
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Обновляем список заявок
            await loadAdminData();
            
            const message = action === 'approve' 
                ? `Заявка #${requestId} одобрена`
                : `Заявка #${requestId} отклонена`;
            
            showNotification(message, 'success');
            
        } else {
            throw new Error(result.error || 'Ошибка обработки заявки');
        }
        
    } catch (error) {
        console.error('Ошибка обработки заявки:', error);
        showNotification('Ошибка: ' + error.message, 'error');
    }
}

function switchAdminTab(tabName) {
    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Активируем выбранную вкладку
    const activeTab = document.querySelector(`.admin-tab[onclick*="${tabName}"]`);
    const activeContent = document.getElementById(`tab-${tabName}`);
    
    if (activeTab) activeTab.classList.add('active');
    if (activeContent) activeContent.classList.add('active');
}

function refreshAdminData() {
    if (!window.supabaseClient.isAdminLoggedIn()) {
        showNotification('Требуется авторизация админа', 'error');
        return;
    }
    
    showNotification('Обновляем админ-данные...', 'info');
    loadAdminData();
}

// ================================
// ИНИЦИАЛИЗАЦИЯ И ОБРАБОТЧИКИ СОБЫТИЙ
// ================================

// Закрытие модальных окон при клике вне контента
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
};

// Обработка клавиши Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
});

// Сохранение админ-токена (разовый ввод)
function setupAdminToken() {
    const savedToken = localStorage.getItem('admin_token');
    if (!savedToken) {
        const token = prompt('Введите админ-токен для работы с выводом средств:');
        if (token) {
            localStorage.setItem('admin_token', token);
            showNotification('Админ-токен сохранен', 'success');
        }
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Страница загружена, запускаем инициализацию...');
    
    // Настройка админ-токена
    setupAdminToken();
    
    // Запуск инициализации игры
    initGame();
    
    // Фокус на поле Telegram при открытии формы вывода
    const telegramInput = document.getElementById('withdrawal-telegram');
    const withdrawalModal = document.getElementById('withdrawal-modal');
    
    if (withdrawalModal && telegramInput) {
        withdrawalModal.addEventListener('shown', function() {
            telegramInput.focus();
        });
    }
});

// Экспорт функций в глобальную область видимости
window.previewCase = previewCase;
window.closePreview = closePreview;
window.openCaseFromPreview = openCaseFromPreview;
window.showWithdrawalModal = showWithdrawalModal;
window.closeWithdrawalModal = closeWithdrawalModal;
window.updateWithdrawalAmount = updateWithdrawalAmount;
window.submitWithdrawalRequest = submitWithdrawalRequest;
window.claimHourlyBonus = claimHourlyBonus;
window.showAdminPanel = showAdminPanel;
window.closeAdminPanel = closeAdminPanel;
window.performAdminLogin = performAdminLogin;
window.adminLogout = adminLogout;
window.processWithdrawalRequest = processWithdrawalRequest;
window.switchAdminTab = switchAdminTab;
window.refreshAdminData = refreshAdminData;
window.refreshAllData = refreshAllData;
window.sellSkin = sellSkin;
window.sellAllSkins = sellAllSkins;
window.sortInventory = sortInventory;
window.closeRoulette = closeRoulette;

console.log('✅ script.js загружен и готов к работе!');