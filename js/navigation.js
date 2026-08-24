function navigateTo(targetId) {
    let file = '';
    if (targetId === 'trackerTab') file = 'templates/tracker.html';
    else if (targetId === 'dashboardTab') file = 'templates/dashboard.html';
    else if (targetId === 'usersTab') file = 'templates/users.html';

    if (!file) return;

    fetch(file)
        .then(res => res.text())
        .then(html => {
            document.getElementById('app-content').innerHTML = html;

            const event = new CustomEvent('pageLoaded', { detail: { page: targetId } });
            document.dispatchEvent(event);
        })
        .catch(err => {
            console.error('Error loading tab:', err);
        });
}

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.nav-link, .nav-logo');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = link.getAttribute('data-target');
            if (!targetId) return;

            document.querySelectorAll('.nav-link').forEach(nl => nl.classList.remove('active'));

            const activeNavLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
            if (activeNavLink) {
                activeNavLink.classList.add('active');
            }

            navigateTo(targetId);
        });
    });
});

window.navigateTo = navigateTo;
