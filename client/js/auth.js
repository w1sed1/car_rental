function showError(msg) {
    const box = document.getElementById('auth-error');
    if (box) {
        box.textContent = msg;
        box.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await api.post('/auth/login', {
                    email:    document.getElementById('email').value,
                    password: document.getElementById('password').value,
                });
                const redirect = new URLSearchParams(location.search).get('redirect') || '/';
                location.href = redirect;
            } catch (err) {
                showError(err.message);
            }
        });
    }

    const regForm = document.getElementById('register-form');
    if (regForm) {
        regForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            try {
                await api.post('/auth/register', {
                    full_name: document.getElementById('full_name').value,
                    email:     document.getElementById('email').value,
                    phone:     document.getElementById('phone').value,
                    password:  document.getElementById('password').value,
                });
                location.href = '/';
            } catch (err) {
                showError(err.message);
            }
        });
    }
});