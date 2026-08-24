window.state = {
    users: JSON.parse(localStorage.getItem('timesheetUsers')) || [
        { id: 'default', name: 'ผู้ใช้งานทั่วไป' }
    ],
    currentUserId: localStorage.getItem('currentUserId') || 'default',
    logs: JSON.parse(localStorage.getItem('attendanceLogs')) || [],
    activeRecords: JSON.parse(localStorage.getItem('activeRecords')) || {},
    currentRange: 'all',
    timerInterval: null
};

function migrateOldData() {
    let changed = false;

    if (localStorage.getItem('activeRecord')) {
        const oldActive = JSON.parse(localStorage.getItem('activeRecord'));
        if (oldActive && !window.state.activeRecords['default']) {
            window.state.activeRecords['default'] = oldActive;
            changed = true;
        }
        localStorage.removeItem('activeRecord');
    }

    window.state.logs.forEach(log => {
        if (!log.userId) {
            log.userId = 'default';
            changed = true;
        }
    });

    if (changed) {
        localStorage.setItem('activeRecords', JSON.stringify(window.state.activeRecords));
        localStorage.setItem('attendanceLogs', JSON.stringify(window.state.logs));
    }
}

function populateUserDropdown() {
    const selects = document.querySelectorAll('.user-select');

    window.state.users = JSON.parse(localStorage.getItem('timesheetUsers')) || [
        { id: 'default', name: 'ผู้ใช้งานทั่วไป' }
    ];

    const isTracker = document.querySelector('.nav-link.active').getAttribute('data-target') === 'trackerTab';
    let userExists = window.state.users.some(u => u.id === window.state.currentUserId) || window.state.currentUserId === 'all';

    if (!isTracker && window.state.currentUserId === 'all') {
        userExists = false;
    }

    if (!userExists) {
        window.state.currentUserId = (!isTracker && window.state.users.length > 0) ? window.state.users[0].id : 'all';
        localStorage.setItem('currentUserId', window.state.currentUserId);
    }

    selects.forEach(select => {
        select.innerHTML = '';

        if (isTracker && window.state.currentUserId === 'all') {
            const allOption = document.createElement('option');
            allOption.value = 'all';
            allOption.textContent = '-- ดูข้อมูลทุกคน --';
            allOption.hidden = true;
            select.appendChild(allOption);
        }

        window.state.users.forEach(user => {
            const option = document.createElement('option');
            option.value = user.id;
            const isActive = window.state.activeRecords && window.state.activeRecords[user.id];
            const activeText = isActive ? ' กำลังเข้างาน' : '';
            option.textContent = `${user.name} (${user.id})${activeText}`;
            select.appendChild(option);
        });
        select.value = window.state.currentUserId;
    });
}
window.populateUserDropdown = populateUserDropdown;

function formatTime(date) { return date.toLocaleTimeString('th-TH'); }

function formatDate(date) {
    const day = date.getDate();
    const month = date.toLocaleDateString('th-TH', { month: 'short' });
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
}

function getLocalDateString(isoString) {
    const d = new Date(isoString);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const date = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${date}`;
}

function formatDurationText(hoursDecimal) {
    const totalMinutes = Math.round(hoursDecimal * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    let textParts = [];
    if (hrs > 0) {
        textParts.push(`${hrs} ชม.`);
    }
    if (mins > 0 || textParts.length === 0) {
        textParts.push(`${mins} นาที`);
    }
    return textParts.join(' ');
}

function calculateDuration(start, end) {
    const diff = new Date(end) - new Date(start);
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let parts = [];
    if (hours > 0) {
        parts.push(`${hours} ชม.`);
    }
    if (minutes > 0) {
        parts.push(`${minutes} นาที`);
    }
    if (hours === 0 && (seconds > 0 || parts.length === 0)) {
        parts.push(`${seconds} วินาที`);
    }
    return parts.join(' ');
}
function handleExportBtnClick() {
    const dataObj = {
        logs: window.state.logs,
        activeRecords: window.state.activeRecords,
        users: JSON.parse(localStorage.getItem('timesheetUsers')) || window.state.users
    };
    const dataStr = JSON.stringify(dataObj, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const filename = `timesheet_${year}-${month}-${day}-${hours}-${minutes}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function handleImportFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.logs !== undefined) {
                window.state.logs = data.logs;

                if (data.users) {
                    localStorage.setItem('timesheetUsers', JSON.stringify(data.users));
                }

                if (data.activeRecords) {
                    window.state.activeRecords = data.activeRecords;
                } else if (data.activeRecord) {
                    window.state.activeRecords = { 'default': data.activeRecord };
                } else {
                    window.state.activeRecords = {};
                }

                localStorage.setItem('attendanceLogs', JSON.stringify(window.state.logs));
                localStorage.setItem('activeRecords', JSON.stringify(window.state.activeRecords));

                migrateOldData();
                populateUserDropdown();

                if (window.refreshCurrentTab) window.refreshCurrentTab();

                alert('นำเข้าข้อมูลเรียบร้อยแล้ว');
            } else {
                alert('โครงสร้างไฟล์ JSON ไม่ถูกต้อง');
            }
        } catch (err) {
            alert('เกิดข้อผิดพลาดในการอ่านไฟล์ JSON');
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

document.addEventListener('change', (e) => {
    if (e.target && e.target.classList.contains('user-select')) {
        window.state.currentUserId = e.target.value;
        localStorage.setItem('currentUserId', window.state.currentUserId);

        document.querySelectorAll('.user-select').forEach(select => {
            select.value = window.state.currentUserId;
        });

        if (window.refreshCurrentTab) window.refreshCurrentTab();
    }

    if (e.target && e.target.id === 'importFile') {
        handleImportFileChange(e);
    }
});

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'clockBtn') {
        handleClockBtnClick();
    } else if (e.target && e.target.id === 'exportBtn') {
        handleExportBtnClick();
    } else if (e.target && e.target.id === 'importBtn') {
        const importFile = document.getElementById('importFile');
        if (importFile) importFile.click();
    } else if (e.target && e.target.id === 'viewAllBtn') {
        window.state.currentUserId = 'all';
        localStorage.setItem('currentUserId', 'all');
        if (window.populateUserDropdown) window.populateUserDropdown();
        if (window.refreshCurrentTab) window.refreshCurrentTab();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    migrateOldData();
    navigateTo('trackerTab');
});

function refreshCurrentTab() {
    const activeLink = document.querySelector('.nav-link.active');
    const activeTab = activeLink ? activeLink.getAttribute('data-target') : '';
    if (activeTab) {
        document.dispatchEvent(new CustomEvent('pageLoaded', { detail: { page: activeTab } }));
    }
}
window.refreshCurrentTab = refreshCurrentTab;

document.addEventListener('pageLoaded', (e) => {
    const page = e.detail.page;

    if (page === 'trackerTab') {
        if (typeof window.populateUserDropdown === 'function') window.populateUserDropdown();
        if (typeof window.updateTracker === 'function') window.updateTracker();
    } else if (page === 'dashboardTab') {
        if (typeof window.populateUserDropdown === 'function') window.populateUserDropdown();
        if (typeof window.updateDashboard === 'function') window.updateDashboard();
    } else if (page === 'usersTab') {
        if (typeof window.renderUsers === 'function') window.renderUsers();
    }
});
