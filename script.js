// Variables globales
let currentUser = null;
let users = JSON.parse(localStorage.getItem('users')) || [];
let notificationsEnabled = JSON.parse(localStorage.getItem('notificationsEnabled')) || false;

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    checkSession();
    requestNotificationPermission();
    scheduleNotifications();
});

// Función para verificar sesión
function checkSession() {
    const session = JSON.parse(localStorage.getItem('currentSession'));
    if (session && session.email) {
        currentUser = users.find(u => u.email === session.email);
        if (currentUser) {
            showScreen('homeScreen');
            updateDashboard();
        }
    }
}

// Registro de usuario
function register() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const age = document.getElementById('registerAge').value;
    const password = document.getElementById('registerPassword').value;

    if (!name || !email || !age || !password) {
        showToast('Por favor completa todos los campos');
        return;
    }

    if (users.find(u => u.email === email)) {
        showToast('Este correo ya está registrado');
        return;
    }

    const newUser = {
        name,
        email,
        age: parseInt(age),
        password,
        workouts: [],
        meditations: [],
        moods: [],
        journals: [],
        goals: [],
        streak: 0,
        lastActivity: null
    };

    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    showToast('¡Registro exitoso! Ahora puedes iniciar sesión');
    showLogin();
}

// Inicio de sesión
function login() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    if (!email || !password) {
        showToast('Por favor ingresa tu correo y contraseña');
        return;
    }

    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        currentUser = user;
        localStorage.setItem('currentSession', JSON.stringify({ email }));
        showScreen('homeScreen');
        updateDashboard();
        showToast(`¡Bienvenido, ${user.name}!`);
        
        // Notificación de bienvenida
        if (notificationsEnabled && 'Notification' in window) {
            new Notification('Bienvenido de vuelta', {
                body: `¡Hola ${user.name}! Es genial verte de nuevo.`,
                icon: '🏠'
            });
        }
    } else {
        showToast('Correo o contraseña incorrectos');
    }
}

// Cerrar sesión
function logout() {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('currentSession');
        currentUser = null;
        showScreen('loginScreen');
        showToast('Sesión cerrada');
    }
}

// Mostrar formulario de registro
function showRegister() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
}

// Mostrar formulario de login
function showLogin() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
}

// Cambiar entre pantallas
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    document.getElementById(screenId).classList.add('active');

    // Actualizar navegación activa
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });

    if (screenId !== 'loginScreen') {
        updateDashboard();
        
        // Actualizar pantallas específicas
        if (screenId === 'progressScreen') {
            updateProgressScreen();
        } else if (screenId === 'goalsScreen') {
            updateGoalsScreen();
        }
    }
}

// Actualizar dashboard
function updateDashboard() {
    if (!currentUser) return;

    // Actualizar nombre en home
    document.getElementById('welcomeMessage').textContent = `Hola, ${currentUser.name}`;

    // Actualizar perfil
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileAge').textContent = currentUser.age;

    // Calcular estadísticas
    const workoutCount = currentUser.workouts.length;
    const meditationCount = currentUser.meditations.length;
    const journalCount = currentUser.journals.length;
    
    const totalMinutes = 
        currentUser.workouts.reduce((sum, w) => sum + w.duration, 0) +
        currentUser.meditations.reduce((sum, m) => sum + m.duration, 0);

    // Actualizar contadores
    document.getElementById('workoutCount').textContent = workoutCount;
    document.getElementById('meditationCount').textContent = meditationCount;
    document.getElementById('journalCount').textContent = journalCount;
    document.getElementById('totalMinutes').textContent = totalMinutes;

    // Calcular resumen semanal (últimos 7 días)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weeklyExercise = currentUser.workouts
        .filter(w => new Date(w.date) > weekAgo)
        .reduce((sum, w) => sum + w.duration, 0);

    const weeklyMeditation = currentUser.meditations
        .filter(m => new Date(m.date) > weekAgo)
        .reduce((sum, m) => sum + m.duration, 0);

    document.getElementById('weeklyExercise').textContent = `${weeklyExercise} min`;
    document.getElementById('weeklyMeditation').textContent = `${weeklyMeditation} min`;

    // Actualizar racha
    updateStreak();
    document.getElementById('streakCount').textContent = currentUser.streak;
    document.getElementById('currentStreak').textContent = `${currentUser.streak} días`;

    // Actualizar historial de ánimo
    updateMoodHistory();

    // Actualizar entradas de diario
    updateJournalEntries();

    // Guardar cambios
    saveUsers();
}

// Actualizar pantalla de Progreso
function updateProgressScreen() {
    if (!currentUser) return;

    // Actualizar estadísticas totales
    document.getElementById('totalWorkouts').textContent = currentUser.workouts.length;
    document.getElementById('totalMeditations').textContent = currentUser.meditations.length;
    document.getElementById('totalJournals').textContent = currentUser.journals.length;
    document.getElementById('progressStreak').textContent = currentUser.streak;

    // Opcional: Actualizar gráfico de actividad diaria (últimos 7 días)
    updateWeeklyChart();
}

// Actualizar gráfico semanal
function updateWeeklyChart() {
    const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
    const chartBars = document.querySelectorAll('.chart-bar');
    
    // Calcular actividad de los últimos 7 días
    const today = new Date();
    const weekActivity = [];
    
    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const dayWorkouts = currentUser.workouts.filter(w => {
            const wDate = new Date(w.date);
            return wDate >= date && wDate < nextDay;
        }).length;
        
        const dayMeditations = currentUser.meditations.filter(m => {
            const mDate = new Date(m.date);
            return mDate >= date && mDate < nextDay;
        }).length;
        
        const dayJournals = currentUser.journals.filter(j => {
            const jDate = new Date(j.date);
            return jDate >= date && jDate < nextDay;
        }).length;
        
        const totalActivity = dayWorkouts + dayMeditations + dayJournals;
        weekActivity.push(totalActivity);
    }
    
    // Encontrar el máximo para normalizar
    const maxActivity = Math.max(...weekActivity, 1);
    
    // Actualizar barras
    chartBars.forEach((bar, index) => {
        if (index < weekActivity.length) {
            const barFill = bar.querySelector('.bar-fill');
            const percentage = (weekActivity[index] / maxActivity) * 100;
            barFill.style.height = `${Math.max(percentage, 10)}%`;
        }
    });
}

// Actualizar pantalla de Metas
function updateGoalsScreen() {
    if (!currentUser) return;

    const goalsList = document.getElementById('goalsList');
    
    if (!currentUser.goals || currentUser.goals.length === 0) {
        goalsList.innerHTML = '<p class="empty-state">No tienes metas aún</p>';
        return;
    }

    goalsList.innerHTML = '';
    
    currentUser.goals.forEach((goal, index) => {
        const goalCard = document.createElement('div');
        goalCard.className = 'goal-card';
        
        const createdDate = new Date(goal.createdAt);
        const formattedDate = createdDate.toLocaleDateString('es-ES', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
        
        goalCard.innerHTML = `
            <div class="goal-header">
                <h4>${goal.completed ? '✅' : '🎯'} ${goal.text}</h4>
                <button onclick="deleteGoal(${index})" class="goal-delete-btn">❌</button>
            </div>
            <div class="goal-footer">
                <span class="goal-date">Creada: ${formattedDate}</span>
                ${!goal.completed ? `<button onclick="completeGoal(${index})" class="goal-complete-btn">Marcar como completada</button>` : '<span class="goal-completed-badge">Completada ✓</span>'}
            </div>
        `;
        
        if (goal.completed) {
            goalCard.classList.add('completed');
        }
        
        goalsList.appendChild(goalCard);
    });
}

// Agregar nueva meta
function addGoal() {
    const goalText = document.getElementById('goalText').value.trim();
    
    if (!goalText) {
        showToast('Por favor escribe una meta');
        return;
    }

    if (!currentUser.goals) {
        currentUser.goals = [];
    }

    const newGoal = {
        text: goalText,
        completed: false,
        createdAt: new Date().toISOString()
    };

    currentUser.goals.push(newGoal);
    document.getElementById('goalText').value = '';
    
    saveUsers();
    updateGoalsScreen();
    showToast('Meta agregada exitosamente');
    
    // Notificación
    if (notificationsEnabled && 'Notification' in window) {
        new Notification('Nueva meta creada', {
            body: `Meta: ${goalText}`,
            icon: '🎯'
        });
    }
}

// Completar meta
function completeGoal(index) {
    if (!currentUser.goals[index]) return;
    
    currentUser.goals[index].completed = true;
    currentUser.goals[index].completedAt = new Date().toISOString();
    
    saveUsers();
    updateGoalsScreen();
    showToast('¡Felicidades! Meta completada');
    
    // Notificación
    if (notificationsEnabled && 'Notification' in window) {
        new Notification('¡Meta completada!', {
            body: `Has completado: ${currentUser.goals[index].text}`,
            icon: '🎉'
        });
    }
}

// Eliminar meta
function deleteGoal(index) {
    if (confirm('¿Estás seguro de que quieres eliminar esta meta?')) {
        currentUser.goals.splice(index, 1);
        saveUsers();
        updateGoalsScreen();
        showToast('Meta eliminada');
    }
}

// Actualizar racha
function updateStreak() {
    if (!currentUser.lastActivity) {
        currentUser.streak = 0;
        return;
    }

    const lastDate = new Date(currentUser.lastActivity);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    lastDate.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
        // Mismo día, mantener racha
    } else if (diffDays === 1) {
        // Día consecutivo, incrementar racha
        currentUser.streak++;
    } else {
        // Se rompió la racha
        currentUser.streak = 1;
    }

    currentUser.lastActivity = new Date().toISOString();
}

// Iniciar ejercicio
function startExercise(name, duration, reps, sets) {
    if (confirm(`¿Comenzar ${name}?`)) {
        const workout = {
            name,
            duration,
            reps,
            sets,
            date: new Date().toISOString()
        };

        currentUser.workouts.push(workout);
        updateStreak();
        saveUsers();
        updateDashboard();
        
        showToast(`¡Excelente! ${name} completado`);
        
        // Notificación
        if (notificationsEnabled && 'Notification' in window) {
            new Notification('¡Entrenamiento completado!', {
                body: `Has completado ${name}. ¡Sigue así!`,
                icon: '🏋️'
            });
        }
    }
}

// Iniciar meditación
function startMeditation(name, duration, type) {
    if (confirm(`¿Comenzar ${name}?`)) {
        const meditation = {
            name,
            duration,
            type,
            date: new Date().toISOString()
        };

        currentUser.meditations.push(meditation);
        updateStreak();
        saveUsers();
        updateDashboard();
        
        showToast(`Meditación ${name} completada`);
        
        // Notificación
        if (notificationsEnabled && 'Notification' in window) {
            new Notification('Meditación completada', {
                body: `Has completado ${name}. Tu mente lo agradece.`,
                icon: '🧘'
            });
        }
    }
}

// Mostrar modal de mood tracker
function showMoodTracker() {
    document.getElementById('moodModal').classList.add('active');
}

// Guardar mood
function saveMood(mood, emoji) {
    const moodEntry = {
        mood,
        emoji,
        date: new Date().toISOString()
    };

    currentUser.moods.push(moodEntry);
    updateStreak();
    saveUsers();
    updateDashboard();
    closeModal('moodModal');
    
    showToast('Estado de ánimo registrado');
    
    // Notificación
    if (notificationsEnabled && 'Notification' in window) {
        new Notification('Ánimo registrado', {
            body: `Has registrado: ${mood}`,
            icon: emoji
        });
    }
}

// Actualizar historial de ánimo
function updateMoodHistory() {
    const container = document.getElementById('moodHistory');
    
    if (currentUser.moods.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay registros de ánimo</p>';
        return;
    }

    const recentMoods = currentUser.moods.slice(-10).reverse();
    
    container.innerHTML = recentMoods.map(mood => {
        const date = new Date(mood.date);
        return `
            <div class="mood-entry">
                <div class="mood-entry-header">
                    <div>
                        <span class="mood-emoji">${mood.emoji}</span>
                        <span class="mood-label">${mood.mood}</span>
                    </div>
                    <span class="mood-date">${formatDate(date)}</span>
                </div>
            </div>
        `;
    }).join('');
}

// Mostrar modal de journal
function showJournal() {
    document.getElementById('journalModal').classList.add('active');
    document.getElementById('journalText').value = '';
}

// Guardar journal
function saveJournal() {
    const text = document.getElementById('journalText').value.trim();
    
    if (!text) {
        showToast('Por favor escribe algo en tu diario');
        return;
    }

    const journalEntry = {
        text,
        date: new Date().toISOString()
    };

    currentUser.journals.push(journalEntry);
    updateStreak();
    saveUsers();
    updateDashboard();
    closeModal('journalModal');
    
    showToast('Entrada de diario guardada');
    
    // Notificación
    if (notificationsEnabled && 'Notification' in window) {
        new Notification('Diario actualizado', {
            body: 'Has agregado una nueva entrada a tu diario.',
            icon: '📝'
        });
    }
}

// Actualizar entradas de diario
function updateJournalEntries() {
    const container = document.getElementById('journalEntries');
    
    if (currentUser.journals.length === 0) {
        container.innerHTML = '<p class="empty-state">No hay entradas de diario</p>';
        return;
    }

    const recentJournals = currentUser.journals.slice(-10).reverse();
    
    container.innerHTML = recentJournals.map(journal => {
        const date = new Date(journal.date);
        return `
            <div class="journal-entry">
                <div class="journal-date">${formatDate(date)}</div>
                <p class="journal-text">${journal.text}</p>
            </div>
        `;
    }).join('');
}

// Cerrar modal
function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('active');
}

// Formatear fecha
function formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours} h`;
    if (days < 7) return `Hace ${days} días`;
    
    return date.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
}

// Mostrar toast
function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Guardar usuarios
function saveUsers() {
    const userIndex = users.findIndex(u => u.email === currentUser.email);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// Solicitar permiso para notificaciones
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                notificationsEnabled = true;
                localStorage.setItem('notificationsEnabled', JSON.stringify(true));
                showToast('Notificaciones activadas');
            }
        });
    }
}

// Toggle notificaciones
function toggleNotifications() {
    if (!('Notification' in window)) {
        showToast('Tu navegador no soporta notificaciones');
        return;
    }

    if (Notification.permission === 'granted') {
        notificationsEnabled = !notificationsEnabled;
        localStorage.setItem('notificationsEnabled', JSON.stringify(notificationsEnabled));
        showToast(notificationsEnabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas');
    } else if (Notification.permission === 'default') {
        requestNotificationPermission();
    } else {
        showToast('Debes permitir notificaciones en la configuración del navegador');
    }
}

// Programar notificaciones diarias
function scheduleNotifications() {
    if (!notificationsEnabled || !('Notification' in window)) return;

    // Notificación de ejercicio matutino (9:00 AM)
    scheduleNotification('¡Buenos días!', 'Es hora de tu ejercicio matutino 🏋️', 9, 0);

    // Notificación de meditación (12:00 PM)
    scheduleNotification('Momento de calma', 'Tómate un momento para meditar 🧘', 12, 0);

    // Notificación de diario nocturno (9:00 PM)
    scheduleNotification('Reflexiona sobre tu día', 'Escribe en tu diario antes de dormir 📝', 21, 0);
}

// Programar una notificación específica
function scheduleNotification(title, body, hour, minute) {
    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hour, minute, 0, 0);

    if (scheduledTime <= now) {
        scheduledTime.setDate(scheduledTime.getDate() + 1);
    }

    const timeUntilNotification = scheduledTime - now;

    setTimeout(() => {
        if (notificationsEnabled && Notification.permission === 'granted') {
            new Notification(title, {
                body: body,
                icon: '🔔',
                badge: '🔔'
            });
        }
        
        // Reprogramar para el día siguiente
        scheduleNotification(title, body, hour, minute);
    }, timeUntilNotification);
}

// Cerrar modales al hacer clic fuera
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
    }
});

// Datos de ejemplo para testing
function createSampleData() {
    if (!currentUser) return;
    
    // Agregar algunos entrenamientos de ejemplo
    for (let i = 0; i < 5; i++) {
        currentUser.workouts.push({
            name: 'Push-ups',
            duration: 3,
            date: new Date(Date.now() - i * 86400000).toISOString()
        });
    }

    // Agregar algunas meditaciones de ejemplo
    for (let i = 0; i < 3; i++) {
        currentUser.meditations.push({
            name: 'Morning Mindfulness',
            duration: 10,
            date: new Date(Date.now() - i * 86400000).toISOString()
        });
    }

    // Agregar algunos moods de ejemplo
    const moods = [
        { mood: 'Feliz', emoji: '😊' },
        { mood: 'Muy feliz', emoji: '😄' },
        { mood: 'Normal', emoji: '😐' }
    ];

    for (let i = 0; i < 3; i++) {
        const randomMood = moods[Math.floor(Math.random() * moods.length)];
        currentUser.moods.push({
            ...randomMood,
            date: new Date(Date.now() - i * 86400000).toISOString()
        });
    }

    // Agregar algunas entradas de diario
    currentUser.journals.push({
        text: 'Hoy fue un gran día. Completé mi rutina de ejercicios y me siento lleno de energía.',
        date: new Date().toISOString()
    });

    // Agregar metas de ejemplo
    currentUser.goals = [
        {
            text: 'Hacer ejercicio 3 veces por semana',
            completed: false,
            createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
        },
        {
            text: 'Meditar 10 minutos diarios',
            completed: false,
            createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
        },
        {
            text: 'Primera entrada de diario',
            completed: true,
            createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
            completedAt: new Date(Date.now() - 6 * 86400000).toISOString()
        }
    ];

    currentUser.streak = 5;
    currentUser.lastActivity = new Date().toISOString();

    saveUsers();
    updateDashboard();
    updateProgressScreen();
    updateGoalsScreen();
    showToast('Datos de ejemplo agregados');
}

// Registrar Service Worker
if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js")
        .then(() => console.log("Service Worker registrado"))
        .catch(err => console.log("Error al registrar SW:", err));
}
// ---------- ELEMENTOS ----------
const progresoInput = document.getElementById("progresoInput");
const metaInput = document.getElementById("metaInput");

const guardarProgresoBtn = document.getElementById("guardarProgreso");
const guardarMetaBtn = document.getElementById("guardarMeta");

const listaProgreso = document.getElementById("listaProgreso");
const listaMeta = document.getElementById("listaMeta");

// ---------- CARGAR DATOS GUARDADOS ----------
document.addEventListener("DOMContentLoaded", () => {
    cargarProgreso();
    cargarMetas();
});

// ---------- GUARDAR PROGRESO ----------
guardarProgresoBtn.addEventListener("click", () => {
    const texto = progresoInput.value.trim();
    if (texto === "") return;

    let progresos = JSON.parse(localStorage.getItem("progresos")) || [];
    progresos.push(texto);
    localStorage.setItem("progresos", JSON.stringify(progresos));

    progresoInput.value = "";
    cargarProgreso();
});

// ---------- GUARDAR META ----------
guardarMetaBtn.addEventListener("click", () => {
    const texto = metaInput.value.trim();
    if (texto === "") return;

    let metas = JSON.parse(localStorage.getItem("metas")) || [];
    metas.push(texto);
    localStorage.setItem("metas", JSON.stringify(metas));

    metaInput.value = "";
    cargarMetas();
});

// ---------- MOSTRAR PROGRESO ----------
function cargarProgreso() {
    let progresos = JSON.parse(localStorage.getItem("progresos")) || [];
    listaProgreso.innerHTML = "";

    progresos.forEach((p, index) => {
        const li = document.createElement("li");
        li.textContent = p;

        const eliminarBtn = document.createElement("button");
        eliminarBtn.textContent = "Eliminar";
        eliminarBtn.classList.add("btnEliminar");

        eliminarBtn.addEventListener("click", () => {
            progresos.splice(index, 1);
            localStorage.setItem("progresos", JSON.stringify(progresos));
            cargarProgreso();
        });

        li.appendChild(eliminarBtn);
        listaProgreso.appendChild(li);
    });
}

// ---------- MOSTRAR METAS ----------
function cargarMetas() {
    let metas = JSON.parse(localStorage.getItem("metas")) || [];
    listaMeta.innerHTML = "";

    metas.forEach((m, index) => {
        const li = document.createElement("li");
        li.textContent = m;

        const eliminarBtn = document.createElement("button");
        eliminarBtn.textContent = "Eliminar";
        eliminarBtn.classList.add("btnEliminar");

        eliminarBtn.addEventListener("click", () => {
            metas.splice(index, 1);
            localStorage.setItem("metas", JSON.stringify(metas));
            cargarMetas();
        });

        li.appendChild(eliminarBtn);
        listaMeta.appendChild(li);
    });
}

// Función para debugging (puede ser llamada desde la consola)
window.createSampleData = createSampleData;