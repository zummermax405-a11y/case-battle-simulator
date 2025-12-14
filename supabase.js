// supabase.js - Полная интеграция с Supabase и Worker

const SUPABASE_URL = 'https://jttsgizkuyipolcnvanc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MV93VmhU8U2I-2m8UquKkw_Eril4zvp';

// Инициализация Supabase клиента
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// URL вашего Cloudflare Worker (ЗАМЕНИТЕ НА СВОЙ!)
const WORKER_URL = 'https://mute-night-5909.zummer-max405.workers.dev';

// ================================
// БАЗОВЫЕ ФУНКЦИИ ДЛЯ ДАННЫХ
// ================================

// Получить все кейсы из базы
async function getCasesFromDB() {
    try {
        console.log('📦 Загрузка кейсов из Supabase...');
        const { data, error } = await supabase
            .from('cases')
            .select(`
                *,
                case_items (
                    chance,
                    skins (*)
                )
            `)
            .order('price', { ascending: true });
        
        if (error) {
            console.error('❌ Ошибка загрузки кейсов:', error);
            throw error;
        }
        
        console.log(`✅ Загружено ${data?.length || 0} кейсов`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Критическая ошибка загрузки кейсов:', error);
        return [];
    }
}

// Получить все скины из базы
async function getSkinsFromDB() {
    try {
        console.log('🎨 Загрузка скинов из Supabase...');
        const { data, error } = await supabase
            .from('skins')
            .select('*')
            .order('value', { ascending: true });
        
        if (error) {
            console.error('❌ Ошибка загрузки скинов:', error);
            throw error;
        }
        
        console.log(`✅ Загружено ${data?.length || 0} скинов`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Критическая ошибка загрузки скинов:', error);
        return [];
    }
}

// ================================
// ФУНКЦИИ ДЛЯ ИГРОКОВ
// ================================

// Получить или создать игрока
async function getOrCreatePlayer() {
    try {
        // Генерируем уникальный ID устройства
        let deviceId = localStorage.getItem('player_device_id');
        
        if (!deviceId) {
            deviceId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('player_device_id', deviceId);
            console.log(`🆕 Создан новый ID устройства: ${deviceId}`);
        }
        
        console.log(`👤 Поиск игрока с ID: ${deviceId}`);
        
        // Пытаемся найти игрока в базе
        const { data: existingPlayer, error: fetchError } = await supabase
            .from('players')
            .select('*')
            .eq('device_id', deviceId)
            .single();
        
        // Если игрок не найден, создаем нового
        if (fetchError && fetchError.code === 'PGRST116') {
            console.log('🆕 Игрок не найден, создаем нового...');
            
            const newPlayer = {
                device_id: deviceId,
                balance: 10000,
                total_spent: 0,
                total_earned: 0,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            };
            
            const { data: createdPlayer, error: createError } = await supabase
                .from('players')
                .insert([newPlayer])
                .select()
                .single();
            
            if (createError) {
                console.error('❌ Ошибка создания игрока:', createError);
                throw createError;
            }
            
            console.log('✅ Создан новый игрок:', createdPlayer);
            return createdPlayer;
            
        } else if (fetchError) {
            console.error('❌ Ошибка поиска игрока:', fetchError);
            throw fetchError;
        }
        
        // Обновляем время последнего входа
        await supabase
            .from('players')
            .update({ last_login: new Date().toISOString() })
            .eq('device_id', deviceId);
        
        console.log('✅ Игрок найден:', existingPlayer);
        return existingPlayer;
        
    } catch (error) {
        console.error('❌ Критическая ошибка работы с игроком:', error);
        
        // Возвращаем заглушку в случае ошибки
        return {
            device_id: localStorage.getItem('player_device_id') || 'error_player',
            balance: 0,
            total_spent: 0,
            total_earned: 0
        };
    }
}

// Получить инвентарь игрока
async function getPlayerInventory(playerId) {
    try {
        console.log(`🎒 Загрузка инвентаря для игрока: ${playerId}`);
        
        const { data, error } = await supabase
            .from('player_inventory')
            .select(`
                *,
                skins (*)
            `)
            .eq('player_id', playerId)
            .eq('sold', false)
            .order('obtained_at', { ascending: false });
        
        if (error) {
            console.error('❌ Ошибка загрузки инвентаря:', error);
            throw error;
        }
        
        console.log(`✅ Загружено ${data?.length || 0} предметов в инвентаре`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Критическая ошибка загрузки инвентаря:', error);
        return [];
    }
}

// ================================
// ФУНКЦИИ ДЛЯ ВЫВОДА СРЕДСТВ
// ================================

// Создать заявку на вывод
async function createWithdrawalRequest(playerId, amount, telegramContact) {
    try {
        console.log(`💸 Создание заявки на вывод:
            Игрок: ${playerId}
            Сумма: ${amount}
            Telegram: ${telegramContact}`);
        
        const { data, error } = await supabase
            .from('withdrawal_requests')
            .insert([{
                player_id: playerId,
                amount: amount,
                telegram_contact: telegramContact,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }])
            .select()
            .single();
        
        if (error) {
            console.error('❌ Ошибка создания заявки:', error);
            throw error;
        }
        
        console.log(`✅ Заявка создана: #${data.id}`);
        return data;
        
    } catch (error) {
        console.error('❌ Критическая ошибка создания заявки:', error);
        throw error;
    }
}

// Получить все заявки на вывод (для админа)
async function getWithdrawalRequests() {
    try {
        console.log('📋 Загрузка заявок на вывод...');
        
        const { data, error } = await supabase
            .from('withdrawal_requests')
            .select(`
                *,
                players (device_id, balance)
            `)
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Ошибка загрузки заявок:', error);
            throw error;
        }
        
        console.log(`✅ Загружено ${data?.length || 0} заявок`);
        return data || [];
        
    } catch (error) {
        console.error('❌ Критическая ошибка загрузки заявок:', error);
        return [];
    }
}

// Обновить статус заявки
async function updateWithdrawalRequestStatus(requestId, status, adminNotes = '') {
    try {
        console.log(`🔄 Обновление статуса заявки #${requestId} на: ${status}`);
        
        const { error } = await supabase
            .from('withdrawal_requests')
            .update({
                status: status,
                admin_notes: adminNotes,
                updated_at: new Date().toISOString()
            })
            .eq('id', requestId);
        
        if (error) {
            console.error('❌ Ошибка обновления статуса:', error);
            throw error;
        }
        
        console.log(`✅ Статус заявки #${requestId} обновлен на: ${status}`);
        return true;
        
    } catch (error) {
        console.error('❌ Критическая ошибка обновления статуса:', error);
        throw error;
    }
}

// ================================
// ФУНКЦИИ АДМИН-ПАНЕЛИ
// ================================

// Авторизация админа
async function adminLogin(username, password) {
    try {
        console.log(`🔐 Попытка входа админа: ${username}`);
        
        // В реальном проекте используйте Supabase Auth!
        // Это временное решение для демонстрации
        
        if (username === 'admin' && password === 'admin123') {
            localStorage.setItem('admin_logged_in', 'true');
            localStorage.setItem('admin_username', username);
            
            console.log('✅ Админ авторизован');
            return { success: true, username: username };
        }
        
        console.log('❌ Неверные данные для входа');
        return { success: false, message: 'Неверный логин или пароль' };
        
    } catch (error) {
        console.error('❌ Ошибка авторизации админа:', error);
        return { success: false, message: 'Ошибка сервера' };
    }
}

// Проверка, авторизован ли админ
function isAdminLoggedIn() {
    return localStorage.getItem('admin_logged_in') === 'true';
}

// Выход админа
function adminLogout() {
    localStorage.removeItem('admin_logged_in');
    localStorage.removeItem('admin_username');
    console.log('👋 Админ вышел из системы');
}

// Получить статистику сайта
async function getSiteStats() {
    try {
        console.log('📊 Загрузка статистики сайта...');
        
        // Получаем количество игроков
        const { count: playersCount, error: playersError } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true });
        
        // Получаем количество заявок
        const { count: requestsCount, error: requestsError } = await supabase
            .from('withdrawal_requests')
            .select('*', { count: 'exact', head: true });
        
        // Получаем общую сумму выводов
        const { data: totalWithdrawals, error: totalError } = await supabase
            .from('withdrawal_requests')
            .select('amount')
            .eq('status', 'approved');
        
        if (playersError || requestsError || totalError) {
            throw new Error('Ошибка загрузки статистики');
        }
        
        const totalAmount = totalWithdrawals?.reduce((sum, item) => sum + item.amount, 0) || 0;
        
        return {
            players: playersCount || 0,
            withdrawalRequests: requestsCount || 0,
            totalWithdrawn: totalAmount,
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('❌ Ошибка загрузки статистики:', error);
        return {
            players: 0,
            withdrawalRequests: 0,
            totalWithdrawn: 0,
            error: error.message
        };
    }
}

// ================================
// ФУНКЦИИ ДЛЯ CLOUDFLARE WORKER
// ================================

// Продажа скина через Worker
async function sellSkinViaWorker(playerId, inventoryId, skinId) {
    try {
        console.log(`💰 Продажа скина через Worker:
            Игрок: ${playerId}
            Инвентарь: ${inventoryId}
            Скин: ${skinId}`);
        
        const response = await fetch(`${WORKER_URL}/api/sell-skin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: playerId,
                inventory_id: inventoryId,
                skin_id: skinId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Результат продажи:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка продажи через Worker:', error);
        throw error;
    }
}

// Обработка заявки на вывод через Worker
async function processWithdrawalViaWorker(requestId, action, adminToken) {
    try {
        console.log(`🔄 Обработка заявки через Worker:
            Заявка: ${requestId}
            Действие: ${action}`);
        
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
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Результат обработки заявки:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка обработки заявки через Worker:', error);
        throw error;
    }
}

// Получить баланс через Worker
async function getBalanceViaWorker(playerId) {
    try {
        console.log(`💳 Получение баланса через Worker: ${playerId}`);
        
        const response = await fetch(`${WORKER_URL}/api/get-balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: playerId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Баланс получен:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка получения баланса через Worker:', error);
        throw error;
    }
}

// Открытие кейса через Worker
async function openCaseViaWorker(playerId, caseId, casePrice) {
    try {
        console.log(`🎰 Открытие кейса через Worker:
            Игрок: ${playerId}
            Кейс: ${caseId}
            Цена: ${casePrice}`);
        
        const response = await fetch(`${WORKER_URL}/api/open-case`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: playerId,
                case_id: caseId,
                case_price: casePrice
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Результат открытия кейса:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка открытия кейса через Worker:', error);
        throw error;
    }
}

// Добавление бонуса через Worker
async function addBonusViaWorker(playerId, amount) {
    try {
        console.log(`🎁 Добавление бонуса через Worker:
            Игрок: ${playerId}
            Сумма: ${amount}`);
        
        const response = await fetch(`${WORKER_URL}/api/add-bonus`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: playerId,
                amount: amount
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Бонус добавлен:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка добавления бонуса через Worker:', error);
        throw error;
    }
}

// Массовая продажа скинов
async function sellAllSkinsViaWorker(playerId) {
    try {
        console.log(`💰 Массовая продажа скинов через Worker: ${playerId}`);
        
        const response = await fetch(`${WORKER_URL}/api/sell-all-skins`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                player_id: playerId
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('✅ Массовая продажа завершена:', result);
        return result;
        
    } catch (error) {
        console.error('❌ Ошибка массовой продажи через Worker:', error);
        throw error;
    }
}

// ================================
// ЭКСПОРТ ФУНКЦИЙ
// ================================

window.supabaseClient = {
    // Supabase функции
    getCasesFromDB,
    getSkinsFromDB,
    getOrCreatePlayer,
    getPlayerInventory,
    createWithdrawalRequest,
    getWithdrawalRequests,
    updateWithdrawalRequestStatus,
    getSiteStats,
    
    // Админ функции
    adminLogin,
    isAdminLoggedIn,
    adminLogout,
    
    // Cloudflare Worker функции
    sellSkinViaWorker,
    processWithdrawalViaWorker,
    getBalanceViaWorker,
    openCaseViaWorker,
    addBonusViaWorker,
    sellAllSkinsViaWorker,
    
    // Утилиты
    getCurrentWorkerUrl: () => WORKER_URL,
    
    // Тестирование подключения
    testConnection: async () => {
        try {
            console.log('🔍 Тестирование подключений...');
            
            // Тест Supabase
            const { data: testData, error: testError } = await supabase
                .from('cases')
                .select('count', { count: 'exact', head: true });
            
            if (testError) {
                console.error('❌ Supabase подключение не работает:', testError);
                return { supabase: false, error: testError.message };
            }
            
            console.log('✅ Supabase подключение работает');
            
            // Тест Cloudflare Worker
            try {
                const response = await fetch(WORKER_URL, { method: 'HEAD' });
                if (response.ok) {
                    console.log('✅ Cloudflare Worker доступен');
                    return { supabase: true, worker: true };
                } else {
                    console.error('❌ Cloudflare Worker недоступен:', response.status);
                    return { supabase: true, worker: false };
                }
            } catch (workerError) {
                console.error('❌ Cloudflare Worker ошибка:', workerError);
                return { supabase: true, worker: false, error: workerError.message };
            }
            
        } catch (error) {
            console.error('❌ Ошибка тестирования подключений:', error);
            return { supabase: false, worker: false, error: error.message };
        }
    }
};

console.log('✅ supabase.js загружен и готов к работе!');
console.log('📊 Конфигурация:');
console.log('  Supabase URL:', SUPABASE_URL);
console.log('  Worker URL:', WORKER_URL);