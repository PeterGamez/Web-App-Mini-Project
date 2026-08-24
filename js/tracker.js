function updateActiveTimer() {
    const durationEl = document.getElementById('activeDuration');
    if (durationEl) {
        const activeRecord = window.state.activeRecords[window.state.currentUserId] || null;
        if (activeRecord) {
            durationEl.textContent = calculateDuration(activeRecord.clockIn, new Date().toISOString());
        }
    }

    const allDurationEls = document.querySelectorAll('.active-duration-all');
    allDurationEls.forEach(el => {
        const userId = el.getAttribute('data-user');
        const activeRecord = window.state.activeRecords[userId];
        if (activeRecord) {
            el.textContent = calculateDuration(activeRecord.clockIn, new Date().toISOString());
        }
    });
}

function updateTracker() {
    const clockBtn = document.getElementById('clockBtn');
    const activeStatus = document.getElementById('activeStatus');
    if (!clockBtn || !activeStatus) return;

    if (window.state.currentUserId === 'all') {
        clockBtn.disabled = true;
        clockBtn.className = 'clock-in disabled';
        clockBtn.style.opacity = '0.5';
        clockBtn.style.cursor = 'not-allowed';
        activeStatus.textContent = 'สถานะ: กรุณาเลือกผู้ใช้งานเฉพาะบุคคลเพื่อลงเวลา';
        activeStatus.className = 'status offline';

        if (window.state.timerInterval) {
            clearInterval(window.state.timerInterval);
            window.state.timerInterval = null;
        }

        const isAnyActive = Object.keys(window.state.activeRecords).length > 0;
        if (isAnyActive && !window.state.timerInterval) {
            window.state.timerInterval = setInterval(updateActiveTimer, 1000);
        }

        renderTable();
        return;
    }

    clockBtn.disabled = false;
    clockBtn.style.opacity = '1';
    clockBtn.style.cursor = 'pointer';

    const activeRecord = window.state.activeRecords[window.state.currentUserId] || null;

    if (activeRecord) {
        clockBtn.textContent = 'Clock Out';
        clockBtn.className = 'clock-out';
        activeStatus.textContent = 'สถานะ: กำลังทำงาน (Active)';
        activeStatus.className = 'status online';

        if (!window.state.timerInterval) {
            window.state.timerInterval = setInterval(updateActiveTimer, 1000);
        }
    } else {
        clockBtn.textContent = 'Clock In';
        clockBtn.className = 'clock-in';
        activeStatus.textContent = 'สถานะ: ยังไม่เข้างาน';
        activeStatus.className = 'status offline';

        const isAnyActive = Object.keys(window.state.activeRecords).length > 0;
        if (window.state.timerInterval && !isAnyActive) {
            clearInterval(window.state.timerInterval);
            window.state.timerInterval = null;
        }
    }
    renderTable();
}

function renderTable() {
    const tableBody = document.querySelector('#timesheetTable tbody');
    const tableHead = document.querySelector('#timesheetTable thead');
    if (!tableBody || !tableHead) return;

    const isAll = window.state.currentUserId === 'all';

    if (isAll) {
        tableHead.innerHTML = `
            <tr>
                <th>ผู้ใช้งาน</th>
                <th>วันที่</th>
                <th>เวลาเข้า</th>
                <th>เวลาออก</th>
                <th>ระยะเวลารวม</th>
                <th>จัดการ</th>
            </tr>
        `;
    } else {
        tableHead.innerHTML = `
            <tr>
                <th>วันที่</th>
                <th>เวลาเข้า</th>
                <th>เวลาออก</th>
                <th>ระยะเวลารวม</th>
                <th>จัดการ</th>
            </tr>
        `;
    }

    tableBody.innerHTML = '';

    const activeRecord = !isAll ? (window.state.activeRecords[window.state.currentUserId] || null) : null;

    const userLogs = window.state.logs
        .map((log, index) => ({ ...log, originalIndex: index }))
        .filter(log => isAll || (log.userId || 'default') === window.state.currentUserId);

    const activeCount = isAll ? Object.keys(window.state.activeRecords).length : (activeRecord ? 1 : 0);

    if (activeCount === 0 && userLogs.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${isAll ? 6 : 5}" class="no-data">ไม่มีรายการในตาราง</td>`;
        tableBody.appendChild(tr);
        return;
    }

    if (isAll) {
        Object.keys(window.state.activeRecords).forEach(userId => {
            const actRec = window.state.activeRecords[userId];
            const userObj = window.state.users.find(u => u.id === userId) || { name: userId };
            const tr = document.createElement('tr');
            tr.className = 'active-row';
            tr.innerHTML = `
                <td><strong>${userObj.name}</strong><br><small>(${userId})</small></td>
                <td>${formatDate(new Date(actRec.clockIn))}</td>
                <td>${formatTime(new Date(actRec.clockIn))}</td>
                <td><span class="badge-active">กำลังทำงาน...</span></td>
                <td><span class="active-duration-all" data-user="${userId}">${calculateDuration(actRec.clockIn, new Date().toISOString())}</span></td>
                <td><button class="cancel-btn-all delete-btn" data-user="${userId}">ยกเลิก</button></td>
            `;

            tr.querySelector('.cancel-btn-all').addEventListener('click', () => {
                if (confirm(`คุณต้องการยกเลิกการบันทึกเวลาปัจจุบันของ "${userObj.name}" ใช่หรือไม่?`)) {
                    delete window.state.activeRecords[userId];
                    localStorage.setItem('activeRecords', JSON.stringify(window.state.activeRecords));
                    updateTracker();
                    if (window.populateUserDropdown) window.populateUserDropdown();
                }
            });

            tableBody.appendChild(tr);
        });
    } else if (activeRecord) {
        const tr = document.createElement('tr');
        tr.className = 'active-row';
        tr.innerHTML = `
            <td>${formatDate(new Date(activeRecord.clockIn))}</td>
            <td>${formatTime(new Date(activeRecord.clockIn))}</td>
            <td><span class="badge-active">กำลังทำงาน...</span></td>
            <td><span id="activeDuration">${calculateDuration(activeRecord.clockIn, new Date().toISOString())}</span></td>
            <td><button class="cancel-btn">ยกเลิก</button></td>
        `;

        tr.querySelector('.cancel-btn').addEventListener('click', () => {
            if (confirm('คุณต้องการยกเลิกการบันทึกเวลาปัจจุบันนี้ใช่หรือไม่?')) {
                delete window.state.activeRecords[window.state.currentUserId];
                localStorage.setItem('activeRecords', JSON.stringify(window.state.activeRecords));
                updateTracker();
                if (window.populateUserDropdown) window.populateUserDropdown();
            }
        });

        tableBody.appendChild(tr);
    }

    for (let i = userLogs.length - 1; i >= 0; i--) {
        const log = userLogs[i];
        const tr = document.createElement('tr');
        const userObj = window.state.users.find(u => u.id === log.userId) || { name: log.userId || 'ไม่ทราบชื่อ' };

        if (isAll) {
            tr.innerHTML = `
                <td><strong>${userObj.name}</strong><br><small>(${log.userId || 'default'})</small></td>
                <td>${formatDate(new Date(log.clockIn))}</td>
                <td>${formatTime(new Date(log.clockIn))}</td>
                <td>${formatTime(new Date(log.clockOut))}</td>
                <td>${calculateDuration(log.clockIn, log.clockOut)}</td>
                <td><button class="delete-btn">ลบ</button></td>
            `;
        } else {
            tr.innerHTML = `
                <td>${formatDate(new Date(log.clockIn))}</td>
                <td>${formatTime(new Date(log.clockIn))}</td>
                <td>${formatTime(new Date(log.clockOut))}</td>
                <td>${calculateDuration(log.clockIn, log.clockOut)}</td>
                <td><button class="delete-btn">ลบ</button></td>
            `;
        }

        tr.querySelector('.delete-btn').addEventListener('click', () => {
            if (confirm('คุณต้องการลบบันทึกเวลานี้ใช่หรือไม่?')) {
                window.state.logs.splice(log.originalIndex, 1);
                localStorage.setItem('attendanceLogs', JSON.stringify(window.state.logs));
                updateTracker();
            }
        });

        tableBody.appendChild(tr);
    }
}

function handleClockBtnClick() {
    const now = new Date().toISOString();
    const activeRecord = window.state.activeRecords[window.state.currentUserId] || null;

    if (activeRecord) {
        window.state.logs.push({
            clockIn: activeRecord.clockIn,
            clockOut: now,
            userId: window.state.currentUserId
        });
        delete window.state.activeRecords[window.state.currentUserId];
        localStorage.setItem('attendanceLogs', JSON.stringify(window.state.logs));
        localStorage.setItem('activeRecords', JSON.stringify(window.state.activeRecords));
    } else {
        window.state.activeRecords[window.state.currentUserId] = { clockIn: now };
        localStorage.setItem('activeRecords', JSON.stringify(window.state.activeRecords));
    }
    updateTracker();
    if (window.populateUserDropdown) window.populateUserDropdown();
}

window.updateTracker = updateTracker;
