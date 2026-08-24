
function processLogs() {
    const dailyData = {};
    const now = new Date();

    let userLogs = window.state.logs.filter(log => (log.userId || 'default') === window.state.currentUserId);

    if (window.state.currentRange === '7days') {
        const limitDate = new Date();
        limitDate.setDate(now.getDate() - 7);
        userLogs = userLogs.filter(log => new Date(log.clockIn) >= limitDate);
    } else if (window.state.currentRange === '30days') {
        const limitDate = new Date();
        limitDate.setDate(now.getDate() - 30);
        userLogs = userLogs.filter(log => new Date(log.clockIn) >= limitDate);
    }

    userLogs.forEach(log => {
        const dateKey = getLocalDateString(log.clockIn);
        const durationMs = new Date(log.clockOut) - new Date(log.clockIn);

        if (!dailyData[dateKey]) {
            dailyData[dateKey] = {
                hours: 0,
                sessions: 0,
                dateStr: dateKey
            };
        }

        dailyData[dateKey].hours += durationMs / (1000 * 60 * 60);
        dailyData[dateKey].sessions += 1;
    });

    return dailyData;
}

function updateSummaryCards(dailyData) {
    const totalHoursEl = document.getElementById('totalHours');
    const totalDaysEl = document.getElementById('totalDays');
    const avgHoursEl = document.getElementById('avgHours');
    const targetCompletionEl = document.getElementById('targetCompletion');

    if (!totalHoursEl || !totalDaysEl || !avgHoursEl || !targetCompletionEl) return;

    const days = Object.keys(dailyData);
    const totalDays = days.length;

    let totalHours = 0;
    let targetMetDays = 0;

    days.forEach(day => {
        const dayHours = dailyData[day].hours;
        totalHours += dayHours;
        if (dayHours >= 8.0) {
            targetMetDays += 1;
        }
    });

    const avgHours = totalDays > 0 ? (totalHours / totalDays) : 0;
    const completionRate = totalDays > 0 ? Math.round((targetMetDays / totalDays) * 100) : 0;

    totalHoursEl.textContent = `${totalHours.toFixed(2)} ชม.`;
    totalDaysEl.textContent = `${totalDays} วัน`;
    avgHoursEl.textContent = `${avgHours.toFixed(2)} ชม./วัน`;
    targetCompletionEl.textContent = `${completionRate}%`;
}

function renderChart(dailyData) {
    const chartContainer = document.getElementById('chartContainer');
    if (!chartContainer) return;

    chartContainer.innerHTML = '';

    const sortedDays = Object.values(dailyData).sort((a, b) => new Date(a.dateStr) - new Date(b.dateStr));
    const chartData = sortedDays.slice(-7);

    const currentUser = window.state.users.find(u => u.id === window.state.currentUserId) || { name: 'ผู้ใช้งาน' };

    if (chartData.length === 0) {
        chartContainer.innerHTML = `<div class="no-data" style="width: 100%;">ไม่มีข้อมูลสถิติของ "${currentUser.name}" สำหรับแสดงกราฟ</div>`;
        return;
    }

    const maxHours = Math.max(...chartData.map(d => d.hours), 8.0);

    chartData.forEach(day => {
        const heightPercent = (day.hours / maxHours) * 100;

        const d = new Date(day.dateStr);
        const dayLabel = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' });

        const barWrapper = document.createElement('div');
        barWrapper.className = 'chart-bar-wrapper';

        barWrapper.innerHTML = `
            <div class="chart-tooltip">${day.hours.toFixed(2)} ชม. (${day.sessions} ครั้ง)</div>
            <div class="chart-bar-container">
                <div class="chart-bar" style="height: 0%;"></div>
            </div>
            <div class="chart-label" title="${formatDate(new Date(day.dateStr), true)}">${dayLabel}</div>
        `;

        chartContainer.appendChild(barWrapper);

        setTimeout(() => {
            const bar = barWrapper.querySelector('.chart-bar');
            if (bar) {
                bar.style.height = `${heightPercent}%`;
            }
        }, 50);
    });
}


function renderDashboardTable(dailyData) {
    const summaryTableBody = document.getElementById('summaryTableBody');
    if (!summaryTableBody) return;

    summaryTableBody.innerHTML = '';

    const sortedDays = Object.values(dailyData).sort((a, b) => new Date(b.dateStr) - new Date(a.dateStr));

    if (sortedDays.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="4" class="no-data">ไม่มีข้อมูลประวัติการทำงานสำหรับแสดงในตาราง</td>`;
        summaryTableBody.appendChild(tr);
        return;
    }

    sortedDays.forEach(day => {
        const tr = document.createElement('tr');

        let statusBadge = '';
        if (day.hours >= 8.0) {
            statusBadge = `<span class="badge-active" style="background-color: var(--success); animation: none;">ผ่านเป้าหมาย (8+ ชม.)</span>`;
        } else if (day.hours >= 4.0) {
            statusBadge = `<span class="badge-active" style="background-color: var(--warning); animation: none;">ครึ่งวัน (4+ ชม.)</span>`;
        } else {
            statusBadge = `<span class="badge-active" style="background-color: var(--danger); animation: none;">ไม่ครบกำหนด</span>`;
        }

        tr.innerHTML = `
            <td>${formatDate(new Date(day.dateStr), true)}</td>
            <td><strong>${formatDurationText(day.hours)}</strong> (${day.hours.toFixed(2)} ชม.)</td>
            <td>${day.sessions} ครั้ง</td>
            <td>${statusBadge}</td>
        `;

        summaryTableBody.appendChild(tr);
    });
}

function updateDashboard() {
    const dailyData = processLogs();

    const selects = document.querySelectorAll('.user-select');
    selects.forEach(select => {
        select.value = window.state.currentUserId;
    });

    updateSummaryCards(dailyData);
    renderChart(dailyData);
    renderDashboardTable(dailyData);
}

document.addEventListener('click', (e) => {
    if (e.target && e.target.classList.contains('filter-btn')) {
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        window.state.currentRange = e.target.getAttribute('data-range');
        updateDashboard();
    }
});

window.updateDashboard = updateDashboard;
