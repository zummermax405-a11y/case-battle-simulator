// auth.js - Система авторизации и регистрации

// Состояние текущего пользователя
let currentUser = null;

// Проверка, авторизован ли пользователь
function isAuthenticated() {
    return localStorage.getItem('auth_token') !== null;
}

// Получить текущего пользователя
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('current_user') || 'null');
}

// Показать модальное окно авторизации
function showAuthModal() {
    document.getElementById('auth-modal').style.display = 'block';
    switchAuthTab('login');
}

// Закрыть модальное окно авторизации
function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

// Переключение между вкладками входа и регистрации
function switchAuthTab(tab) {
    // Убираем активный класс со всех вкладок
    document.querySelectorAll('.auth-tab').forEach(t => {
        t.classList.remove('active');
    });
    
    document.querySelectorAll('.auth-form').forEach(f => {
        f.classList.remove('active');
    });
    
    // Активируем выбранную вкладку
    document.querySelector(`.auth-tab[onclick*="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
    
    // Очищаем ошибки
    document.getElementById(`${tab}-error`).textContent = '';
}

// Регистрация нового пользователя
async function registerUser() {
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-confirm').value;
    const errorElement = document.getElementById('register-error');
    
    // Валидация
    if (!email || !password || !confirm) {
        errorElement.textContent = 'Заполните все поля';
        return;
    }
    
    if (password.length < 6) {
        errorElement.textContent = 'Пароль должен содержать минимум 6 символов';
        return;
    }
    
    if (password !== confirm) {
        errorElement.textContent = 'Пароли не совпадают';
        return;
    }
    
    try {
        // Используем Supabase Auth для регистрации
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    balance: 10000,
                    role: 'user',
                    created_at: new Date().toISOString()
                }
            }
        });
        
        if (error) throw error;
        
        // Если регистрация успешна
        if (data.user) {
            // Создаем запись в таблице users
            const { error: userError } = await supabase
                .from('users')
                .insert([{
                    id: data.user.id,
                    email: email,
                    balance: 10000,
                    role: 'user',
                    created_at: new Date().toISOString()
                }]);
            
            if (userError) throw userError;
            
            // Показываем успешное сообщение
            errorElement.style.color = '#00b894';
            errorElement.textContent = 'Регистрация успешна! Проверьте email для подтверждения.';
            
            // Переключаем на вкладку входа через 2 секунды
            setTimeout(() => {
                switchAuthTab('login');
                document.getElementById('login-email').value = email;
            }, 2000);
        }
        
    } catch (error) {
        console.error('Ошибка регистрации:', error);
        errorElement.textContent = error.message || 'Ошибка регистрации';
    }
}

// Вход пользователя
async function loginUser() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorElement = document.getElementById('login-error');
    
    if (!email || !password) {
        errorElement.textContent = 'Заполните все поля';
        return;
    }
    
    try {
        // Используем Supabase Auth для входа
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });
        
        if (error) throw error;
        
        // Получаем данные пользователя из таблицы users
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single();
        
        if (userError) throw userError;
        
        // Сохраняем токен и данные пользователя
        localStorage.setItem('auth_token', data.session.access_token);
        localStorage.setItem('current_user', JSON.stringify(userData));
        currentUser = userData;
        
        // Обновляем интерфейс
        updateAuthUI();
        closeAuthModal();
        
        // Показываем уведомление
        showNotification(`Добро пожаловать, ${userData.email}!`, 'success');
        
        // Обновляем баланс
        if (window.refreshAllData) {
            refreshAllData();
        }
        
    } catch (error) {
        console.error('Ошибка входа:', error);
        errorElement.textContent = error.message || 'Неверный email или пароль';
    }
}

// Выход пользователя
async function logoutUser() {
    try {
        await supabase.auth.signOut();
        
        // Очищаем localStorage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        currentUser = null;
        
        // Обновляем интерфейс
        updateAuthUI();
        
        // Показываем уведомление
        showNotification('Вы вышли из системы', 'info');
        
        // Перезагружаем страницу для сброса состояния
        setTimeout(() => location.reload(), 1000);
        
    } catch (error) {
        console.error('Ошибка выхода:', error);
        showNotification('Ошибка при выходе', 'error');
    }
}

// Обновление интерфейса в зависимости от статуса авторизации
function updateAuthUI() {
    const authButton = document.getElementById('auth-button');
    const userProfile = document.getElementById('user-profile');
    
    if (isAuthenticated() && currentUser) {
        // Показываем профиль пользователя
        if (authButton) authButton.style.display = 'none';
        
        if (userProfile) {
            userProfile.style.display = 'flex';
            document.getElementById('user-email').textContent = currentUser.email;
            document.getElementById('user-balance-display').textContent = 
                currentUser.balance?.toLocaleString() || '0';
            
            // Показываем кнопку админ-панели для админов
            if (currentUser.role === 'admin') {
                document.getElementById('admin-section').style.display = 'block';
            }
        }
    } else {
        // Показываем кнопку входа
        if (authButton) authButton.style.display = 'block';
        if (userProfile) userProfile.style.display = 'none';
        document.getElementById('admin-section').style.display = 'none';
    }
}

// Проверка авторизации при загрузке страницы
async function checkAuthOnLoad() {
    try {
        // Проверяем, есть ли активная сессия
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (data.session) {
            // Получаем данные пользователя
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.session.user.id)
                .single();
            
            if (userError) throw userError;
            
            // Сохраняем данные
            localStorage.setItem('auth_token', data.session.access_token);
            localStorage.setItem('current_user', JSON.stringify(userData));
            currentUser = userData;
        }
        
        // Обновляем интерфейс
        updateAuthUI();
        
    } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        // Очищаем данные при ошибке
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
    }
}

// Обновление интерфейса в зависимости от статуса авторизации
function updateAuthUI() {
    const authButtons = document.getElementById('auth-buttons');
    const userProfile = document.getElementById('user-profile');
    const currentUser = getCurrentUser();
    
    console.log('Обновление интерфейса авторизации, пользователь:', currentUser);
    
    if (currentUser) {
        // Показываем профиль пользователя
        if (authButtons) {
            authButtons.style.display = 'none';
        }
        
        if (userProfile) {
            userProfile.style.display = 'flex';
            
            // Обновляем данные пользователя
            document.getElementById('user-email-display').textContent = 
                currentUser.email || 'Пользователь';
            
            // Создаем аватар из первой буквы email
            const avatarElement = document.getElementById('user-avatar');
            if (avatarElement && currentUser.email) {
                const firstLetter = currentUser.email.charAt(0).toUpperCase();
                avatarElement.textContent = firstLetter;
            }
            
            // Обновляем баланс (если есть в данных)
            const balanceDisplay = document.getElementById('user-balance-display');
            if (balanceDisplay) {
                if (currentUser.balance !== undefined) {
                    balanceDisplay.textContent = formatNumber(currentUser.balance);
                } else if (gameState && gameState.balance !== undefined) {
                    balanceDisplay.textContent = formatNumber(gameState.balance);
                }
            }
        }
        
        // Показываем кнопку админ-панели для админов
        if (currentUser.role === 'admin') {
            const adminSection = document.getElementById('admin-section');
            if (adminSection) {
                adminSection.style.display = 'flex';
            }
        }
        
    } else {
        // Показываем кнопки входа
        if (authButtons) {
            authButtons.style.display = 'block';
        }
        
        if (userProfile) {
            userProfile.style.display = 'none';
        }
        
        // Скрываем админ-панель
        const adminSection = document.getElementById('admin-section');
        if (adminSection) {
            adminSection.style.display = 'none';
        }
    }
}

// Форматирование чисел (добавьте в auth.js если нет)
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Проверка авторизации при загрузке страницы
async function checkAuthOnLoad() {
    console.log('🔍 Проверка авторизации...');
    
    try {
        // Проверяем, есть ли сохраненная сессия в Supabase
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('Ошибка получения сессии:', error);
            // Очищаем данные при ошибке
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            updateAuthUI();
            return;
        }
        
        if (data.session) {
            console.log('✅ Найдена активная сессия');
            
            // Получаем данные пользователя из таблицы users
            const { data: userData, error: userError } = await supabase
                .from('users')
                .select('*')
                .eq('id', data.session.user.id)
                .single();
            
            if (userError) {
                console.error('Ошибка получения данных пользователя:', userError);
                
                // Если пользователя нет в таблице users, создаем запись
                if (userError.code === 'PGRST116') {
                    const { data: newUser, error: createError } = await supabase
                        .from('users')
                        .insert([{
                            id: data.session.user.id,
                            email: data.session.user.email,
                            balance: 10000,
                            role: 'user',
                            created_at: new Date().toISOString()
                        }])
                        .select()
                        .single();
                    
                    if (createError) {
                        console.error('Ошибка создания записи пользователя:', createError);
                        throw createError;
                    }
                    
                    // Сохраняем данные нового пользователя
                    localStorage.setItem('auth_token', data.session.access_token);
                    localStorage.setItem('current_user', JSON.stringify(newUser));
                    currentUser = newUser;
                    
                } else {
                    throw userError;
                }
            } else {
                // Сохраняем данные существующего пользователя
                localStorage.setItem('auth_token', data.session.access_token);
                localStorage.setItem('current_user', JSON.stringify(userData));
                currentUser = userData;
            }
            
            console.log('👤 Пользователь загружен:', currentUser);
            
        } else {
            console.log('❌ Активная сессия не найдена');
            // Очищаем данные если нет сессии
            localStorage.removeItem('auth_token');
            localStorage.removeItem('current_user');
            currentUser = null;
        }
        
        // Обновляем интерфейс
        updateAuthUI();
        
        // Если пользователь авторизован, загружаем данные игры
        if (currentUser && window.initGame) {
            console.log('🎮 Запускаем игру для авторизованного пользователя');
            setTimeout(() => window.initGame(), 500);
        }
        
    } catch (error) {
        console.error('❌ Критическая ошибка проверки авторизации:', error);
        // Очищаем все данные при ошибке
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        currentUser = null;
        updateAuthUI();
    }
}

// Инициализация авторизации при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 Страница загружена, инициализируем авторизацию...');
    
    // Проверяем авторизацию
    checkAuthOnLoad();
    
    // Периодически проверяем обновления сессии
    setInterval(checkAuthOnLoad, 5 * 60 * 1000); // Каждые 5 минут
});

// Экспорт функций
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
window.switchAuthTab = switchAuthTab;
window.registerUser = registerUser;
window.loginUser = loginUser;
window.logoutUser = logoutUser;
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;