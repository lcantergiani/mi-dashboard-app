class JarvisSystem {
    constructor() {
        this.state = {
            goals: JSON.parse(localStorage.getItem('jarvis_goals')) || [],
            calendar: JSON.parse(localStorage.getItem('jarvis_calendar')) || {},
            completion: JSON.parse(localStorage.getItem('jarvis_completion')) || {},
            lastLogin: localStorage.getItem('jarvis_lastLogin') || new Date().toDateString()
        };
        this.currentModalMode = null; 
        this.selectedCalCell = null; 
        this.selectedGoalId = null; // Guardar id de la meta inspeccionada
        
        this.init();
    }

    init() {
        this.cacheDOM();
        this.bindEvents();
        this.startClock();
        this.renderAll();
    }

    cacheDOM() {
        this.timeEl = document.getElementById('currentTime');
        this.dateEl = document.getElementById('currentDate');
        this.habitsContainer = document.getElementById('habitsContainer');
        this.goalsContainer = document.getElementById('goalsContainer');
        this.calendarContainer = document.getElementById('calendarContainer');
        this.reportContainer = document.getElementById('reportContainer');
        this.monthlyTotalRatio = document.getElementById('monthlyTotalRatio');
        this.progressBar = document.getElementById('dailyProgressBar');
        this.progressText = document.getElementById('dailyProgressText');
        
        this.modalOverlay = document.getElementById('modalOverlay');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalInputName = document.getElementById('modalInputName');
        this.modalSubmitBtn = document.getElementById('modalSubmitBtn');
        this.modalDeleteBtn = document.getElementById('modalDeleteBtn');
    }

    bindEvents() {
        this.modalSubmitBtn.addEventListener('click', () => this.handleModalSubmit());
        
        this.modalDeleteBtn.addEventListener('click', () => {
            if (this.currentModalMode === 'calendar') {
                delete this.state.calendar[this.selectedCalCell];
                this.saveState();
                this.renderAll();
                this.closeModal();
            }
        });

        // Close on overlay click for both modals
        this.modalOverlay.addEventListener('click', (e) => {
            if (e.target === this.modalOverlay) this.closeModal();
        });
        
        const goalModalOverlay = document.getElementById('goalDetailsModalOverlay');
        if(goalModalOverlay) {
            goalModalOverlay.addEventListener('click', (e) => {
                if(e.target === goalModalOverlay) this.closeGoalDetailsModal();
            });
        }

        const morningModalOverlay = document.getElementById('morningTextModalOverlay');
        if(morningModalOverlay) {
            morningModalOverlay.addEventListener('click', (e) => {
                if(e.target === morningModalOverlay) this.closeMorningTextModal();
            });
        }
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            this.timeEl.innerText = now.toLocaleTimeString('es-ES', { hour12: false });
            const dateStr = now.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
            this.dateEl.innerText = dateStr.toUpperCase();
        };
        
        const checkDay = () => {
             const now = new Date();
             if (this.state.lastLogin !== now.toDateString()) {
                 this.state.lastLogin = now.toDateString();
                 this.saveState();
                 this.renderAll();
             }
        };

        updateTime();
        setInterval(() => {
            updateTime();
            checkDay();
            if (this.updateTimeIndicator) this.updateTimeIndicator();
        }, 1000);
    }

    saveState() {
        localStorage.setItem('jarvis_goals', JSON.stringify(this.state.goals));
        localStorage.setItem('jarvis_calendar', JSON.stringify(this.state.calendar));
        localStorage.setItem('jarvis_completion', JSON.stringify(this.state.completion));
        localStorage.setItem('jarvis_lastLogin', this.state.lastLogin);
    }

    renderAll() {
        this.renderHabits();
        this.renderGoals();
        this.renderCalendar();
        this.renderMonthlyReport();
        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // --- Protocolos Diarios Dinámicos desde Calendario ---
    renderHabits() {
        if(!this.habitsContainer) return;
        this.habitsContainer.innerHTML = '';
        
        const daysIndex = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        const todayName = daysIndex[new Date().getDay()];
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${month}-${day}`;

        const todaysActivities = [];
        const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 1, 2, 3, 4, 5];
        
        hours.forEach(hour => {
            const cellId = `${todayName}_${hour}`;
            if (this.state.calendar[cellId]) {
                todaysActivities.push({
                    id: cellId,
                    time: hour,
                    name: this.state.calendar[cellId],
                    completed: !!this.state.completion[`${todayDateStr}_${cellId}`]
                });
            }
        });

        if (todaysActivities.length === 0) {
            this.habitsContainer.innerHTML = '<div class="log-entry system" style="text-align:center; padding: 2rem 0; opacity: 0.6;">Sin procedimientos tácticos inicializados.</div>';
            this.progressBar.style.width = '0%';
            this.progressText.innerText = '0%';
            return;
        }

        let completedCount = 0;
        todaysActivities.forEach(act => {
            if (act.completed) completedCount++;
            const card = document.createElement('div');
            card.className = 'item-card';
            card.innerHTML = `
                <div class="habit-header">
                    <div class="habit-check ${act.completed ? 'done' : ''}" onclick="app.toggleDailyActivity('${act.id}')">
                        <i data-lucide="check" class="check-icon"></i>
                    </div>
                    <div class="habit-details" style="flex:1;">
                        <div style="display:flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
                                <span class="habit-name ${act.completed ? 'text-muted' : ''}" style="${act.completed ? 'text-decoration: line-through' : ''}">${act.name}</span>
                                ${act.name.toLowerCase().includes('despertar') ? `<button class="jarvis-btn glow-btn outline" style="padding: 0.1rem 0.6rem; font-size: 0.7rem; width: auto; min-width: auto; border: 1px solid var(--accent-primary); letter-spacing: 0px;" onclick="app.showMorningTextModal(event)">[LEER]</button>` : ''}
                            </div>
                            <span class="font-mono text-sm text-accent" style="opacity:0.8; margin-left: 0.5rem;">${act.time}:00</span>
                        </div>
                    </div>
                </div>
            `;
            this.habitsContainer.appendChild(card);
        });

        const total = todaysActivities.length;
        const pct = total === 0 ? 0 : Math.round((completedCount / total) * 100);
        this.progressBar.style.width = `${pct}%`;
        this.progressText.innerText = `${pct}%`;
        
        if (pct === 100 && total > 0) {
            this.progressBar.style.boxShadow = "0 0 15px var(--success-color)";
            this.progressBar.style.backgroundColor = "var(--success-color)";
        } else {
            this.progressBar.style.boxShadow = "var(--accent-glow)";
            this.progressBar.style.backgroundColor = "var(--accent-primary)";
        }
    }

    toggleDailyActivity(cellId) {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayDateStr = `${year}-${month}-${day}`;

        const key = `${todayDateStr}_${cellId}`;
        
        if (this.state.completion[key]) {
            delete this.state.completion[key];
        } else {
            this.state.completion[key] = true;
        }
        
        this.saveState();
        this.renderAll();
    }

    // --- Reporte Mensual ---
    renderMonthlyReport() {
        if (!this.reportContainer) return;
        this.reportContainer.innerHTML = '';
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const currentMonthPrefix = `${year}-${month}`; 
        
        let completedThisMonth = 0;
        const activityStats = {};

        Object.keys(this.state.completion).forEach(key => {
            if (key.startsWith(currentMonthPrefix)) {
                completedThisMonth++;
                const parts = key.split('_');
                const cellId = parts[1] + '_' + parts[2];
                const actName = this.state.calendar[cellId] || "Actividad Histórica";
                
                if (!activityStats[actName]) {
                    activityStats[actName] = 0;
                }
                activityStats[actName]++;
            }
        });

        this.monthlyTotalRatio.innerText = `${completedThisMonth}`;
        
        if (Object.keys(activityStats).length === 0) {
            this.reportContainer.innerHTML = '<div class="log-entry system" style="text-align:center; padding: 2rem 0; opacity: 0.6;">Sin cumplimiento táctico en este ciclo.</div>';
            return;
        }

        Object.keys(activityStats).sort((a,b) => activityStats[b] - activityStats[a]).forEach(actName => {
            const count = activityStats[actName];
            const statCard = document.createElement('div');
            statCard.className = 'item-card';
            statCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="font-mono text-sm" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 70%;">${actName}</span>
                    <span class="font-mono text-accent" style="font-size: 1.1rem; display:flex; align-items:center; gap:0.25rem;">
                        ${count} <i data-lucide="check-circle" style="width:16px;height:16px;"></i>
                    </span>
                </div>
            `;
            this.reportContainer.appendChild(statCard);
        });
    }

    // --- Hitos y Metas (Directrices) ---
    renderGoals() {
        if(!this.goalsContainer) return;
        this.goalsContainer.innerHTML = '';

        if (this.state.goals.length === 0) {
            this.goalsContainer.innerHTML = '<div class="log-entry system" style="text-align:center; padding: 2rem 0; opacity: 0.6;">NO HAY PROCEDIMIENTOS MAYORES REGISTRADOS.</div>';
        }

        this.state.goals.forEach(goal => {
            if(!goal.milestones) goal.milestones = []; // migración segura
            const total = goal.milestones.length;
            const completed = goal.milestones.filter(m => m.completed).length;
            const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
            
            const card = document.createElement('div');
            card.className = 'item-card';
            card.style.cursor = 'pointer';
            card.title = "Abrir mapa de hitos";
            
            card.onclick = (e) => {
                if(e.target.closest('.action-icon.trash')) {
                    this.deleteGoal(goal.id);
                } else {
                    this.showGoalDetailsModal(goal.id);
                }
            };
            
            card.innerHTML = `
                <div class="goal-header" style="pointer-events: none;">
                    <span class="goal-name font-mono text-accent" style="font-size: 1.1rem; text-transform: uppercase;">${goal.name}</span>
                    <span class="goal-pct">${pct}%</span>
                </div>
                <div class="progress-bar-container" style="margin-bottom: 0.5rem; height: 6px; pointer-events: none;">
                    <div class="progress-bar-fill" style="width: ${pct}%; background: var(--blue-accent); box-shadow: var(--blue-glow);"></div>
                </div>
                <div style="display:flex; justify-content: space-between; align-items: center;">
                    <span class="font-mono text-muted text-xs" style="pointer-events: none;">${completed} / ${total} HITOS COMPLETADOS</span>
                    <div class="goal-controls" style="display:flex; gap: 0.75rem; margin-top: 0">
                        <i data-lucide="trash-2" class="action-icon trash" style="color:var(--danger-color); pointer-events: auto;" title="Eliminar proyecto"></i>
                    </div>
                </div>
            `;
            this.goalsContainer.appendChild(card);
        });
    }

    deleteGoal(id) {
        if(confirm('¿Eliminar permanente la directriz principal?')) {
            this.state.goals = this.state.goals.filter(g => g.id !== id);
            this.saveState();
            this.renderAll();
        }
    }

    // Modal de Detalles de la Meta (Hitos)
    showGoalDetailsModal(goalId) {
        this.selectedGoalId = goalId;
        const goal = this.state.goals.find(g => g.id === goalId);
        if (!goal) return;

        document.getElementById('goalDetailsTitle').innerText = `< ${goal.name.toUpperCase()} />`;
        this.renderMilestones();
        document.getElementById('goalDetailsModalOverlay').classList.remove('hidden');
        setTimeout(() => document.getElementById('newMilestoneInput').focus(), 100);
    }

    closeGoalDetailsModal() {
        document.getElementById('goalDetailsModalOverlay').classList.add('hidden');
        this.selectedGoalId = null;
    }

    showMorningTextModal(e) {
        if(e) e.stopPropagation();
        document.getElementById('morningTextModalOverlay').classList.remove('hidden');
    }

    closeMorningTextModal() {
        document.getElementById('morningTextModalOverlay').classList.add('hidden');
    }

    addMilestone() {
        const input = document.getElementById('newMilestoneInput');
        if(!input) return;
        const name = input.value.trim();
        if (!name) return;

        const goal = this.state.goals.find(g => g.id === this.selectedGoalId);
        if (!goal) return;

        if (!goal.milestones) goal.milestones = [];
        goal.milestones.push({
            id: 'm_' + Date.now(),
            name: name,
            comment: '',
            completed: false
        });

        input.value = '';
        this.saveState();
        this.renderMilestones();
        this.renderAll(); // actualiza la barra principal detrás
    }

    toggleMilestone(mId) {
        const goal = this.state.goals.find(g => g.id === this.selectedGoalId);
        if (!goal) return;
        const ms = goal.milestones.find(m => m.id === mId);
        if (!ms) return;

        ms.completed = !ms.completed;
        this.saveState();
        this.renderMilestones();
        this.renderAll();
    }

    deleteMilestone(mId) {
        const goal = this.state.goals.find(g => g.id === this.selectedGoalId);
        if (!goal) return;
        goal.milestones = goal.milestones.filter(m => m.id !== mId);
        this.saveState();
        this.renderMilestones();
        this.renderAll();
    }

    updateMilestoneComment(mId, commentText) {
        const goal = this.state.goals.find(g => g.id === this.selectedGoalId);
        if (!goal) return;
        const ms = goal.milestones.find(m => m.id === mId);
        if (!ms) return;

        ms.comment = commentText;
        this.saveState();
    }

    renderMilestones() {
        const container = document.getElementById('milestonesContainer');
        const pbFill = document.getElementById('goalDetailsProgressBar');
        const pbText = document.getElementById('goalDetailsProgressText');

        const goal = this.state.goals.find(g => g.id === this.selectedGoalId);
        if (!goal) return;

        container.innerHTML = '';
        if (!goal.milestones) goal.milestones = [];

        const total = goal.milestones.length;
        const completed = goal.milestones.filter(m => m.completed).length;
        const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

        pbFill.style.width = `${pct}%`;
        pbText.innerText = `${pct}%`;

        if (goal.milestones.length === 0) {
            container.innerHTML = '<div class="log-entry system text-center" style="font-size:0.9rem; opacity: 0.5;">No hay etapas registradas. Inyecte datos.</div>';
        }

        goal.milestones.forEach(ms => {
            const card = document.createElement('div');
            card.className = 'item-card';
            card.style.background = 'transparent';
            card.style.borderLeft = ms.completed ? '3px solid var(--success-color)' : '3px solid var(--accent-primary)';
            
            card.innerHTML = `
                <div style="display:flex; align-items:flex-start; gap:1rem;">
                    <div class="habit-check ${ms.completed ? 'done' : ''}" style="margin-top: 4px; border-color: ${ms.completed ? 'var(--success-color)' : 'var(--accent-primary)'}; background: ${ms.completed ? 'var(--success-color)' : 'transparent'};" onclick="app.toggleMilestone('${ms.id}')">
                        <i data-lucide="check" class="check-icon" style="color: #fff; opacity: ${ms.completed ? 1 : 0}"></i>
                    </div>
                    <div style="flex:1;">
                        <span class="font-mono text-sm" style="display:block; font-weight: bold; color: ${ms.completed ? 'var(--success-color)' : 'var(--text-main)'}; text-transform: uppercase;">${ms.name}</span>
                        <input type="text" class="jarvis-input font-mono text-xs" style="margin-top: 0.5rem; padding: 0.4rem; background: rgba(255,255,255,0.05); border: 1px dashed var(--panel-border); width: 100%; border-radius: 2px;" value="${ms.comment || ''}" onchange="app.updateMilestoneComment('${ms.id}', this.value)" placeholder="// Ingresar feedback o comentario del avance...">
                    </div>
                    <i data-lucide="trash-2" class="action-icon trash text-danger" style="margin-top: 4px; color: var(--danger-color);" onclick="app.deleteMilestone('${ms.id}')"></i>
                </div>
            `;
            container.appendChild(card);
        });

        if (window.lucide) {
            window.lucide.createIcons();
        }
    }

    // --- Calendar ---
    renderCalendar() {
        if (!this.calendarContainer) return;
        this.calendarContainer.innerHTML = '';
        
        const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 1, 2, 3, 4, 5];

        const corner = document.createElement('div');
        corner.className = 'cal-header';
        this.calendarContainer.appendChild(corner);
        
        days.forEach(day => {
            const el = document.createElement('div');
            el.className = 'cal-header font-mono';
            el.innerText = day.substring(0, 3).toUpperCase();
            this.calendarContainer.appendChild(el);
        });

        hours.forEach(hour => {
            const timeEl = document.createElement('div');
            timeEl.className = 'cal-time font-mono';
            timeEl.innerText = `${hour}:00`;
            this.calendarContainer.appendChild(timeEl);

            days.forEach(day => {
                const cellId = `${day}_${hour}`;
                const activity = this.state.calendar[cellId];
                
                const cell = document.createElement('div');
                cell.className = `cal-cell ${activity ? 'has-event' : ''}`;
                cell.onclick = () => this.showCalendarModal(day, hour, activity);
                
                if (activity) {
                    cell.innerHTML = `<span class="event-text" title="${activity}">${activity}</span>`;
                }
                
                this.calendarContainer.appendChild(cell);
            });
        });

        // Add the time indicator line
        const indicator = document.createElement('div');
        indicator.id = 'calendarTimeIndicator';
        indicator.className = 'calendar-time-indicator';
        this.calendarContainer.appendChild(indicator);
        
        this.updateTimeIndicator();
        
        // Auto-scroll al indicador la primera vez que se carga
        if (!this.scrolledToTime) {
            this.scrolledToTime = true;
            setTimeout(() => {
                const scrollPos = parseInt(indicator.style.top) - (this.calendarContainer.clientHeight / 2);
                if (scrollPos > 0) {
                    this.calendarContainer.scrollTo({ top: scrollPos, behavior: 'smooth' });
                }
            }, 500);
        }
    }

    updateTimeIndicator() {
        const indicator = document.getElementById('calendarTimeIndicator');
        if (!indicator) return;

        const now = new Date();
        
        // Asignar a la columna del día actual
        const day = now.getDay(); // 0(Dom) a 6(Sab)
        const colIndex = (day === 0) ? 8 : day + 1; 
        indicator.style.gridColumn = `${colIndex} / span 1`;
        indicator.style.gridRow = '1 / -1';

        let currH = now.getHours();
        if (currH === 0) currH = 24;
        
        const hoursArr = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 1, 2, 3, 4, 5];
        const index = hoursArr.indexOf(currH);
        
        if (index === -1) {
            indicator.style.display = 'none';
            return;
        }

        indicator.style.display = 'block';
        const currM = now.getMinutes();
        const baseTop = 28;
        const rowHeight = 39;
        const topPx = baseTop + (index * rowHeight) + ((currM / 60) * rowHeight);
        
        indicator.style.top = `${topPx}px`;
    }

    // --- Modals (General) ---
    showAddGoalModal() {
        this.currentModalMode = 'goal';
        this.modalTitle.innerText = "NUEVO_PROYECTO.meta";
        this.modalDeleteBtn.style.display = 'none';
        this.modalInputName.value = '';
        this.modalOverlay.classList.remove('hidden');
        setTimeout(() => this.modalInputName.focus(), 100);
    }

    showCalendarModal(day, hour, currentActivity) {
        this.currentModalMode = 'calendar';
        this.selectedCalCell = `${day}_${hour}`;
        this.modalTitle.innerText = `ACTIVIDAD::${day.toUpperCase()}[${hour}:00]`;
        this.modalInputName.value = currentActivity || '';
        
        if (currentActivity) {
            this.modalDeleteBtn.style.display = 'flex';
        } else {
            this.modalDeleteBtn.style.display = 'none';
        }
        
        this.modalOverlay.classList.remove('hidden');
        setTimeout(() => this.modalInputName.focus(), 100);
    }

    closeModal() {
        this.modalOverlay.classList.add('hidden');
        this.currentModalMode = null;
    }

    handleModalSubmit() {
        const name = this.modalInputName.value.trim();
        if(!name && this.currentModalMode !== 'calendar') {
            this.closeModal();
            return;
        }

        if (this.currentModalMode === 'goal') {
            this.state.goals.push({
                id: 'g_' + Date.now(),
                name: name,
                milestones: []
            });
        } else if (this.currentModalMode === 'calendar') {
            if (name) {
                this.state.calendar[this.selectedCalCell] = name;
            } else {
                delete this.state.calendar[this.selectedCalCell];
            }
        }

        this.saveState();
        this.renderAll();
        this.closeModal();
    }
}

window.onload = () => {
    window.app = new JarvisSystem();
};
