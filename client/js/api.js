const API = '/api';

async function request(method, path, body) {
    const opts = {
        method,
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(API + path, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err = new Error(data.error || 'Помилка запиту');
        err.status = res.status;
        throw err;
    }
    return data;
}

window.api = {
    get:  (p)    => request('GET', p),
    post: (p, b) => request('POST', p, b),
    put:  (p, b) => request('PUT', p, b),
    del:  (p)    => request('DELETE', p),
};

window.fmt = {
    money: (n) => new Intl.NumberFormat('uk-UA').format(n) + ' грн',
    date:  (d) => new Date(d).toLocaleDateString('uk-UA', {
        day: '2-digit', month: 'short', year: 'numeric'
    }),
    short: (d) => new Date(d).toLocaleDateString('uk-UA', {
        day: '2-digit', month: 'short'
    }),
};

window.currentUser = null;

async function loadCurrentUser() {
    try {
        const { user } = await api.get('/auth/me');
        window.currentUser = user;
    } catch {
        window.currentUser = null;
    }
    renderHeaderActions();
}

function renderHeaderActions() {
    const el = document.getElementById('header-actions');
    if (!el) return;
    if (currentUser) {
        const initials = currentUser.full_name
            .split(' ')
            .map(s => s[0])
            .slice(0, 2)
            .join('');
        el.innerHTML = `
            <a href="/profile.html" class="site-header__user">
                <span class="avatar">${initials}</span>
                <span>${currentUser.full_name.split(' ')[0]}</span>
            </a>
            ${currentUser.role === 'admin'
                ? '<a href="/admin.html" class="btn-ghost">Адмін</a>'
                : ''}
            <button class="btn-login" onclick="logout()">Вийти</button>
        `;
    } else {
        el.innerHTML = `
            <a href="/login.html" class="btn-login">Увійти</a>
            <a href="/register.html" class="btn-signup">Реєстрація</a>
        `;
    }
}

async function logout() {
    await api.post('/auth/logout');
    location.href = '/';
}

document.addEventListener('DOMContentLoaded', loadCurrentUser);