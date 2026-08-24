let userEditMode = false;
let editingUserId = null;

function saveUsers() {
    localStorage.setItem('timesheetUsers', JSON.stringify(window.state.users));
}

function resetUserForm() {
    const newUserId = document.getElementById('newUserId');
    const newUsername = document.getElementById('newUsername');
    const formTitle = document.getElementById('formTitle');
    const saveUserBtn = document.getElementById('saveUserBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');

    if (newUserId) {
        newUserId.value = '';
        newUserId.disabled = false;
    }
    if (newUsername) newUsername.value = '';

    userEditMode = false;
    editingUserId = null;

    if (formTitle) formTitle.textContent = 'เพิ่มผู้ใช้งานใหม่';
    if (saveUserBtn) saveUserBtn.textContent = 'เพิ่มผู้ใช้งาน';
    if (cancelEditBtn) cancelEditBtn.style.display = 'none';
}

function renderUsers() {
    const usersTableBody = document.getElementById('usersTableBody');
    if (!usersTableBody) return;

    usersTableBody.innerHTML = '';

    window.state.users.forEach(user => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td><code>${user.id}</code></td>
            <td><strong>${user.name}</strong></td>
            <td style="text-align: center; white-space: nowrap;">
                <button class="edit-btn" style="background-color: var(--primary-light); color: var(--primary); padding: 5px 10px; font-size: 12px; margin-right: 5px;">แก้ไข</button>
                <button class="delete-btn" style="padding: 5px 10px; font-size: 12px;">ลบ</button>
            </td>
        `;

        tr.querySelector('.edit-btn').addEventListener('click', () => {
            const newUserId = document.getElementById('newUserId');
            const newUsername = document.getElementById('newUsername');
            const formTitle = document.getElementById('formTitle');
            const saveUserBtn = document.getElementById('saveUserBtn');
            const cancelEditBtn = document.getElementById('cancelEditBtn');

            if (newUserId && newUsername) {
                newUserId.value = user.id;
                newUserId.disabled = true;
                newUsername.value = user.name;
                newUsername.focus();
            }

            userEditMode = true;
            editingUserId = user.id;

            if (formTitle) formTitle.textContent = 'แก้ไขข้อมูลผู้ใช้งาน';
            if (saveUserBtn) saveUserBtn.textContent = 'บันทึกการแก้ไข';
            if (cancelEditBtn) cancelEditBtn.style.display = 'block';
        });

        tr.querySelector('.delete-btn').addEventListener('click', () => {
            if (window.state.users.length <= 1) {
                alert('ไม่สามารถลบได้ เนื่องจากระบบจำเป็นต้องมีผู้ใช้งานอย่างน้อย 1 คน');
                return;
            }

            if (confirm(`คุณแน่ใจว่าต้องการลบผู้ใช้งาน "${user.name}" (ID: ${user.id}) ใช่หรือไม่?\n*ประวัติการทำงานของพนักงานรายนี้จะไม่ถูกลบแต่จะไม่แสดงในตัวเลือก`)) {
                window.state.users = window.state.users.filter(u => u.id !== user.id);
                saveUsers();

                if (window.state.currentUserId === user.id) {
                    window.state.currentUserId = window.state.users[0].id;
                    localStorage.setItem('currentUserId', window.state.currentUserId);
                }

                if (window.populateUserDropdown) {
                    window.populateUserDropdown();
                }

                renderUsers();
                resetUserForm();

                if (window.refreshCurrentTab) window.refreshCurrentTab();
            }
        });

        usersTableBody.appendChild(tr);
    });
}

document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'userForm') {
        e.preventDefault();

        const newUserId = document.getElementById('newUserId');
        const newUsername = document.getElementById('newUsername');

        if (!newUserId || !newUsername) return;

        const id = newUserId.value.trim();
        const name = newUsername.value.trim();

        if (!id || !name) return;

        if (userEditMode) {
            const userIndex = window.state.users.findIndex(u => u.id === editingUserId);
            if (userIndex !== -1) {
                window.state.users[userIndex].name = name;
                saveUsers();
                alert('แก้ไขข้อมูลผู้ใช้งานสำเร็จ');
            }
        } else {
            const isDuplicate = window.state.users.some(u => u.id.toLowerCase() === id.toLowerCase());
            if (isDuplicate) {
                alert('รหัสพนักงาน (User ID) นี้มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น');
                return;
            }

            window.state.users.push({ id, name });
            saveUsers();
            alert('เพิ่มผู้ใช้งานใหม่สำเร็จ');
        }

        if (window.populateUserDropdown) {
            window.populateUserDropdown();
        }
        renderUsers();
        resetUserForm();
    }
});

document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'cancelEditBtn') {
        resetUserForm();
    }
});

window.renderUsers = renderUsers;
window.resetUserForm = resetUserForm;
