// Игровые данные
let gameState = {
    balance: 10000,
    inventory: [],
    casesOpened: 0,
    achievements: [],
    lastDailyBonus: null
};

// База данных виртуальных скинов
const virtualSkins = [
    // Обычные (Common) - серый
    { id: 1, name: "Glock-18 | Moonrise", rarity: "common", value: 50, color: "#B0B0B0", emoji: "🔫" },
    { id: 2, name: "USP-S | Torque", rarity: "common", value: 75, color: "#B0B0B0", emoji: "🔫" },
    { id: 3, name: "P250 | Valence", rarity: "common", value: 60, color: "#B0B0B0", emoji: "🔫" },
    
    // Необычные (Uncommon) - синий
    { id: 4, name: "AK-47 | Redline", rarity: "uncommon", value: 200, color: "#4CC9F0", emoji: "🔫" },
    { id: 5, name: "M4A4 | Dragon King", rarity: "uncommon", value: 250, color: "#4CC9F0", emoji: "🔫" },
    { id: 6, name: "AWP | Sun in Leo", rarity: "uncommon", value: 300, color: "#4CC9F0", emoji: "🎯" },
    
    // Редкие (Rare) - фиолетовый
    { id: 7, name: "Karambit | Doppler", rarity: "rare", value: 1000, color: "#9D4EDD", emoji: "🔪" },
    { id: 8, name: "M9 Bayonet | Tiger Tooth", rarity: "rare", value: 1200, color: "#9D4EDD", emoji: "🔪" },
    { id: 9, name: "Butterfly Knife | Fade", rarity: "rare", value: 1500, color: "#9D4EDD", emoji: "🔪" },
    
    // Эпические (Epic) - розовый
    { id: 10, name: "Dragon Lore", rarity: "epic", value: 5000, color: "#F72585", emoji: "🎯" },
    { id: 11, name: "Medusa", rarity: "epic", value: 4500, color: "#F72585", emoji: "🎯" },
    
    // Легендарные (Legendary) - золотой
    { id: 12, name: "Souvenir AWP | Dragon Lore", rarity: "legendary", value: 10000, color: "#FFD700", emoji: "🏆" },
    { id: 13, name: "StatTrak™ Karambit | Emerald", rarity: "legendary", value: 15000, color: "#FFD700", emoji: "💎" }
];

// База данных кейсов
const cases = [
    {
        id: 1,
        name: "📦 Обычный кейс",
        price: 100,
        emoji: "📦",
        description: "Стандартный кейс с обычными предметами",
        drops: [
            { skinId: 1, chance: 40 },
            { skinId: 2, chance: 30 },
            { skinId: 3, chance: 20 },
            { skinId: 4, chance: 8 },
            { skinId: 7, chance: 2 }
        ]
    },
    {
        id: 2,
        name: "🔷 Премиум кейс",
        price: 500,
        emoji: "🔷",
        description: "Шанс получить редкие предметы",
        drops: [
            { skinId: 4, chance: 35 },
            { skinId: 5, chance: 30 },
            { skinId: 6, chance: 20 },
            { skinId: 7, chance: 10 },
            { skinId: 10, chance: 5 }
        ]
    },
    {
        id: 3,
        name: "⭐ Легендарный кейс",
        price: 2000,
        emoji: "⭐",
        description: "Высокий шанс на эпические и легендарные предметы",
        drops: [
            { skinId: 7, chance: 30 },
            { skinId: 8, chance: 25 },
            { skinId: 9, chance: 20 },
            { skinId: 10, chance: 15 },
            { skinId: 12, chance: 10 }
        ]
    }
];

// Достижения
const achievements = [
    { id: 1, name: "Новичок", description: "Откройте 10 кейсов", icon: "🎮", reward: 500, condition: (state) => state.casesOpened >= 10 },
    { id: 2, name: "Коллекционер", description: "Соберите 5 предметов", icon: "🎒", reward: 1000, condition: (state) => state.inventory.length >= 5 },
    { id: 3, name: "Богач", description: "Накопите 50,000 монет", icon: "💰", reward: 5000, condition: (state) => state.balance >= 50000 },
    { id: 4, name: "Ветеран", description: "Откройте 100 кейсов", icon: "🏅", reward: 10000, condition: (state) => state.casesOpened >= 100 }
];

// Инициализация игры
function initGame() {
    loadGame();
    renderCases();
    renderInventory();
    renderAchievements();
    updateUI();
}

// Сохранение игры
function saveGame() {
    localStorage.setItem('caseBattleSave', JSON.stringify(gameState));
    console.log("Игра сохранена");
}

// Загрузка игры
function loadGame() {
    const saved = localStorage.getItem('caseBattleSave');
    if (saved) {
        gameState = JSON.parse(saved);
        console.log("Игра загружена");
    }
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('balance').textContent = gameState.balance.toLocaleString();
    document.getElementById('inventory-count').textContent = gameState.inventory.length;
    document.getElementById('cases-opened').textContent = gameState.casesOpened;
}

// Рендер кейсов
function renderCases() {
    const container = document.getElementById('cases-container');
    container.innerHTML = '';
    
    cases.forEach(cs => {
        const caseElement = document.createElement('div');
        caseElement.className = 'case-item';
        caseElement.onclick = () => openCase(cs.id);
        
        caseElement.innerHTML = `
            <div class="case-image">${cs.emoji}</div>
            <h3>${cs.name}</h3>
            <p class="case-price">${cs.price} монет</p>
            <p class="case-description">${cs.description}</p>
            <p class="case-rarity">Нажмите, чтобы открыть</p>
        `;
        
        container.appendChild(caseElement);
    });
}

// Открытие кейса
function openCase(caseId) {
    const selectedCase = cases.find(c => c.id === caseId);
    
    if (!selectedCase) {
        alert("Кейс не найден!");
        return;
    }
    
    if (gameState.balance < selectedCase.price) {
        alert("Недостаточно монет!");
        return;
    }
    
    // Списание денег
    gameState.balance -= selectedCase.price;
    gameState.casesOpened++;
    
    // Определение выигрыша
    const random = Math.random() * 100;
    let cumulativeChance = 0;
    let wonSkinId = null;
    
    for (const drop of selectedCase.drops) {
        cumulativeChance += drop.chance;
        if (random <= cumulativeChance) {
            wonSkinId = drop.skinId;
            break;
        }
    }
    
    const wonSkin = virtualSkins.find(s => s.id === wonSkinId);
    
    // Добавление в инвентарь
    gameState.inventory.push({
        ...wonSkin,
        obtainedAt: new Date().toISOString()
    });
    
    // Показ анимации открытия
    showOpeningAnimation(wonSkin);
    
    // Обновление и сохранение
    updateUI();
    saveGame();
    checkAchievements();
}

// Анимация открытия кейса
function showOpeningAnimation(skin) {
    const screen = document.getElementById('opening-screen');
    const spinner = document.getElementById('spinner-item');
    const result = document.getElementById('opening-result');
    
    // Показываем экран
    screen.style.display = 'flex';
    
    // Анимация спиннера
    let count = 0;
    const spinnerInterval = setInterval(() => {
        const randomSkin = virtualSkins[Math.floor(Math.random() * virtualSkins.length)];
        spinner.innerHTML = `${randomSkin.emoji} ${randomSkin.name}`;
        spinner.style.color = randomSkin.color;
        count++;
        
        if (count > 10) { // Через 10 смен показываем результат
            clearInterval(spinnerInterval);
            spinner.innerHTML = `${skin.emoji} ${skin.name}`;
            spinner.style.color = skin.color;
            
            result.innerHTML = `
                <h3 style="color: ${skin.color}">🎉 ВЫ ВЫИГРАЛИ!</h3>
                <p>${skin.emoji} <strong>${skin.name}</strong></p>
                <p>Редкость: <span style="color: ${skin.color}">${getRarityName(skin.rarity)}</span></p>
                <p>Ценность: ${skin.value} монет</p>
            `;
        }
    }, 200);
}

function closeOpeningScreen() {
    document.getElementById('opening-screen').style.display = 'none';
    renderInventory(); // Обновляем инвентарь
}

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

// Рендер инвентаря
function renderInventory() {
    const container = document.getElementById('inventory-container');
    
    if (gameState.inventory.length === 0) {
        container.innerHTML = '<p class="empty-inventory">Ваш инвентарь пуст. Откройте кейсы, чтобы получить предметы!</p>';
        return;
    }
    
    container.innerHTML = '';
    
    gameState.inventory.forEach((skin, index) => {
        const skinElement = document.createElement('div');
        skinElement.className = `skin-card skin-${skin.rarity}`;
        
        skinElement.innerHTML = `
            <div class="skin-icon" style="font-size: 2em;">${skin.emoji}</div>
            <div class="skin-name">${skin.name}</div>
            <div class="skin-rarity" style="color: ${skin.color}">
                ${getRarityName(skin.rarity)}
            </div>
            <div class="skin-value">${skin.value} монет</div>
        `;
        
        container.appendChild(skinElement);
    });
}

// Сортировка инвентаря
function sortInventory(by) {
    if (by === 'rarity') {
        const rarityOrder = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };
        gameState.inventory.sort((a, b) => rarityOrder[b.rarity] - rarityOrder[a.rarity]);
    } else if (by === 'value') {
        gameState.inventory.sort((a, b) => b.value - a.value);
    }
    
    renderInventory();
}

// Ежедневный бонус
function claimDailyBonus() {
    const today = new Date().toDateString();
    
    if (gameState.lastDailyBonus === today) {
        alert("Вы уже получали бонус сегодня! Завтра приходите снова.");
        return;
    }
    
    const bonus = Math.floor(Math.random() * 1000) + 500;
    gameState.balance += bonus;
    gameState.lastDailyBonus = today;
    
    updateUI();
    saveGame();
    
    alert(`🎁 Вы получили ежедневный бонус: ${bonus} монет!\nПриходите завтра за новым бонусом!`);
}

// Добавление монет (для тестирования)
function addCoins(amount) {
    gameState.balance += amount;
    updateUI();
    saveGame();
    alert(`Добавлено ${amount} монет. Текущий баланс: ${gameState.balance}`);
}

// Сброс игры
function resetGame() {
    if (confirm("Вы уверены? Весь прогресс будет удален!")) {
        gameState = {
            balance: 10000,
            inventory: [],
            casesOpened: 0,
            achievements: [],
            lastDailyBonus: null
        };
        
        localStorage.removeItem('caseBattleSave');
        updateUI();
        renderInventory();
        renderAchievements();
        alert("Игра сброшена!");
    }
}

// Проверка достижений
function checkAchievements() {
    achievements.forEach(achievement => {
        if (!gameState.achievements.includes(achievement.id) && 
            achievement.condition(gameState)) {
            
            gameState.achievements.push(achievement.id);
            gameState.balance += achievement.reward;
            
            alert(`🏆 Достижение разблокировано: ${achievement.name}!\nНаграда: ${achievement.reward} монет`);
            
            renderAchievements();
            updateUI();
            saveGame();
        }
    });
}

// Рендер достижений
function renderAchievements() {
    const container = document.getElementById('achievements-container');
    container.innerHTML = '';
    
    achievements.forEach(achievement => {
        const isUnlocked = gameState.achievements.includes(achievement.id);
        const element = document.createElement('div');
        element.className = `achievement ${isUnlocked ? '' : 'locked'}`;
        
        element.innerHTML = `
            <div class="achievement-icon">${achievement.icon}</div>
            <div>
                <h4>${achievement.name} ${isUnlocked ? '✅' : '🔒'}</h4>
                <p>${achievement.description}</p>
                <p><small>Награда: ${achievement.reward} монет</small></p>
            </div>
        `;
        
        container.appendChild(element);
    });
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', initGame);