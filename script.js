// ================================
// ИГРОВЫЕ ДАННЫЕ И КОНФИГУРАЦИЯ
// ================================

// Состояние игры
let gameState = {
    balance: 10000,
    inventory: [],
    casesOpened: 0,
    achievements: [],
    lastBonusTime: null
};

// База данных виртуальных скинов
const virtualSkins = [
    // Обычные (Common) - серый
    { id: 1, name: "Glock-18 | Moonrise", rarity: "common", value: 50, color: "#B0B0B0", emoji: "🔫" },
    { id: 2, name: "USP-S | Torque", rarity: "common", value: 75, color: "#B0B0B0", emoji: "🔫" },
    { id: 3, name: "P250 | Valence", rarity: "common", value: 60, color: "#B0B0B0", emoji: "🔫" },
    { id: 13, name: "MAC-10 | Lapis Gator", rarity: "common", value: 45, color: "#B0B0B0", emoji: "🔫" },
    
    // Необычные (Uncommon) - синий
    { id: 4, name: "AK-47 | Redline", rarity: "uncommon", value: 200, color: "#4CC9F0", emoji: "🔫" },
    { id: 5, name: "M4A4 | Dragon King", rarity: "uncommon", value: 250, color: "#4CC9F0", emoji: "🔫" },
    { id: 6, name: "AWP | Sun in Leo", rarity: "uncommon", value: 300, color: "#4CC9F0", emoji: "🎯" },
    { id: 14, name: "Desert Eagle | Bronze Deco", rarity: "uncommon", value: 180, color: "#4CC9F0", emoji: "🔫" },
    
    // Редкие (Rare) - фиолетовый
    { id: 7, name: "Karambit | Doppler", rarity: "rare", value: 1000, color: "#9D4EDD", emoji: "🔪" },
    { id: 8, name: "M9 Bayonet | Tiger Tooth", rarity: "rare", value: 1200, color: "#9D4EDD", emoji: "🔪" },
    { id: 9, name: "Butterfly Knife | Fade", rarity: "rare", value: 1500, color: "#9D4EDD", emoji: "🔪" },
    { id: 15, name: "M4A1-S | Hot Rod", rarity: "rare", value: 800, color: "#9D4EDD", emoji: "🔫" },
    
    // Эпические (Epic) - розовый
    { id: 10, name: "AWP | Dragon Lore", rarity: "epic", value: 5000, color: "#F72585", emoji: "🎯" },
    { id: 11, name: "M4A4 | Howl", rarity: "epic", value: 4500, color: "#F72585", emoji: "🔫" },
    { id: 16, name: "AK-47 | Fire Serpent", rarity: "epic", value: 4000, color: "#F72585", emoji: "🔫" },
    
    // Легендарные (Legendary) - золотой
    { id: 12, name: "Souvenir AWP | Dragon Lore", rarity: "legendary", value: 10000, color: "#FFD700", emoji: "🏆" },
    { id: 17, name: "StatTrak™ Karambit | Emerald", rarity: "legendary", value: 15000, color: "#FFD700", emoji: "💎" },
    { id: 18, name: "M9 Bayonet | Sapphire", rarity: "legendary", value: 12000, color: "#FFD700", emoji: "🔪" }
];

// База данных кейсов
const cases = [
    {
        id: 1,
        name: "📦 Обычный кейс",
        price: 100,
        emoji: "📦",
        description: "Стандартный кейс с обычными предметами",
        color: "#4CC9F0",
        drops: [
            { skinId: 1, chance: 25 },
            { skinId: 2, chance: 20 },
            { skinId: 3, chance: 18 },
            { skinId: 13, chance: 15 },
            { skinId: 4, chance: 12 },
            { skinId: 5, chance: 6 },
            { skinId: 7, chance: 3 },
            { skinId: 10, chance: 1 }
        ]
    },
    {
        id: 2,
        name: "🔷 Премиум кейс",
        price: 500,
        emoji: "🔷",
        description: "Шанс получить редкие предметы",
        color: "#9D4EDD",
        drops: [
            { skinId: 4, chance: 22 },
            { skinId: 5, chance: 20 },
            { skinId: 14, chance: 18 },
            { skinId: 6, chance: 15 },
            { skinId: 15, chance: 10 },
            { skinId: 7, chance: 8 },
            { skinId: 8, chance: 4 },
            { skinId: 10, chance: 2 },
            { skinId: 12, chance: 1 }
        ]
    },
    {
        id: 3,
        name: "⭐ Легендарный кейс",
        price: 2000,
        emoji: "⭐",
        description: "Высокий шанс на эпические и легендарные предметы",
        color: "#FFD700",
        drops: [
            { skinId: 7, chance: 20 },
            { skinId: 8, chance: 18 },
            { skinId: 15, chance: 16 },
            { skinId: 9, chance: 14 },
            { skinId: 16, chance: 12 },
            { skinId: 10, chance: 8 },
            { skinId: 11, chance: 6 },
            { skinId: 17, chance: 4 },
            { skinId: 12, chance: 2 }
        ]
    }
];

// Достижения
const achievements = [
    { 
        id: 1, 
        name: "Новичок", 
        description: "Откройте 10 кейсов", 
        icon: "🎮", 
        reward: 500, 
        condition: (state) => state.casesOpened >= 10 
    },
    { 
        id: 2, 
        name: "Коллекционер", 
        description: "Соберите 5 предметов", 
        icon: "🎒", 
        reward: 1000, 
        condition: (state) => state.inventory.length >= 5 
    },
    { 
        id: 3, 
        name: "Богач", 
        description: "Накопите 50,000 монет", 
        icon: "💰", 
        reward: 5000, 
        condition: (state) => state.balance >= 50000 
    },
    { 
        id: 4, 
        name: "Ветеран", 
        description: "Откройте 100 кейсов", 
        icon: "🏅", 
        reward: 10000, 
        condition: (state) => state.casesOpened >= 100 
    },
    { 
        id: 5, 
        name: "Удачливый", 
        description: "Выиграйте легендарный предмет", 
        icon: "🍀", 
        reward: 3000, 
        condition: (state) => state.inventory.some(skin => skin.rarity === "legendary") 
    }
];

// Глобальные переменные для рулетки
let selectedCaseForOpening = null;
let isRouletteSpinning = false;
let rouletteAnimation = null;
let wonSkin = null;

// ================================
// ИНИЦИАЛИЗАЦИЯ И УТИЛИТЫ
// ================================

// Инициализация игры
function initGame() {
    loadGame();
    renderCases();
    renderInventory();
    renderAchievements();
    updateUI();
    updateBonusTimer();
    
    // Запускаем обновление таймера бонуса каждую секунду
    setInterval(updateBonusTimer, 1000);
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

// Сохранение игры
function saveGame() {
    const saveData = {
        ...gameState,
        inventory: gameState.inventory.map(item => ({
            ...item,
            obtainedAt: item.obtainedAt || new Date().toISOString()
        }))
    };
    localStorage.setItem('caseBattleSave', JSON.stringify(saveData));
}

// Загрузка игры
function loadGame() {
    const saved = localStorage.getItem('caseBattleSave');
    if (saved) {
        const parsed = JSON.parse(saved);
        gameState = {
            ...gameState,
            ...parsed,
            inventory: parsed.inventory || []
        };
        console.log("Игра загружена");
    }
}

// Обновление интерфейса
function updateUI() {
    document.getElementById('balance').textContent = gameState.balance.toLocaleString();
    document.getElementById('inventory-count').textContent = gameState.inventory.length;
    document.getElementById('cases-opened').textContent = gameState.casesOpened;
}

// ================================
// СИСТЕМА Б