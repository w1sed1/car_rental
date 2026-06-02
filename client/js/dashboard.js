let chart = null;

async function loadDashboard() {
    try {
        const data = await api.get('/admin/dashboard');
        renderKPI(data.overview);
        renderChart(data.byDay);
        renderPopular(data.popular);
        renderMaintenance(data.maintenance);
        renderRisk(data.risk);
        renderCity(data.byCity);
    } catch (e) {
        if (e.status === 403 || e.status === 401) {
            alert('Доступ тільки для адміністратора');
            location.href = '/login.html';
        }
    }
}

function renderKPI(o) {
    document.getElementById('kpi-grid').innerHTML = `
        <div class="kpi">
            <div class="lbl">Користувачі</div>
            <div class="val">${o.total_users}</div>
            <div class="delta">${o.banned_users} забанено</div>
        </div>
        <div class="kpi">
            <div class="lbl">Активні бронювання</div>
            <div class="val">${o.active_bookings}</div>
            <div class="delta up">${o.bookings_30d} за 30 днів</div>
        </div>
        <div class="kpi">
            <div class="lbl">Авто в системі</div>
            <div class="val">${o.total_cars}</div>
            <div class="delta">${o.available_cars} вільних · ${o.rented_cars} в оренді</div>
        </div>
        <div class="kpi">
            <div class="lbl">Дохід 30 днів</div>
            <div class="val">${fmt.money(o.revenue_30d)}</div>
            <div class="delta up">завершені бронювання</div>
        </div>
    `;
}

function renderChart(byDay) {
    const ctx = document.getElementById('chart-bookings');
    if (!ctx) return;
    if (chart) chart.destroy();

    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels:   byDay.map(d => fmt.short(d.date)),
            datasets: [
                {
                    label: 'Усього',
                    data: byDay.map(d => +d.total),
                    borderColor: '#d4a574',
                    backgroundColor: 'rgba(212,165,116,.1)',
                    tension: 0.35,
                    fill: true,
                    pointRadius: 0,
                    borderWidth: 2,
                },
                {
                    label: 'Скасовано',
                    data: byDay.map(d => +d.cancelled),
                    borderColor: '#c47878',
                    tension: 0.35,
                    pointRadius: 0,
                    borderWidth: 1.5,
                    borderDash: [4, 4],
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: '#a8a097',
                        font: { family: 'JetBrains Mono', size: 10 },
                    },
                },
            },
            scales: {
                x: {
                    ticks: { color: '#6b665e', font: { size: 10 } },
                    grid:  { color: 'rgba(255,248,220,.05)' },
                },
                y: {
                    ticks: { color: '#6b665e' },
                    grid:  { color: 'rgba(255,248,220,.05)' },
                    beginAtZero: true,
                },
            },
        },
    });
}

function renderPopular(cars) {
    document.getElementById('popular-table').innerHTML = `
        <table class="data">
            <thead><tr><th>Авто</th><th>Бронювань</th><th>Дохід</th></tr></thead>
            <tbody>
                ${cars.map(c => `
                    <tr>
                        <td><strong>${c.brand} ${c.model}</strong>
                            <span style="color:#6b665e"> ${c.year}</span></td>
                        <td>${c.bookings_count || 0}</td>
                        <td>${fmt.money(c.total_revenue || 0)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderMaintenance(cars) {
    const el = document.getElementById('maintenance-table');
    if (!cars.length) {
        el.innerHTML = '<p style="color:#a8a097;padding:20px;">Усі авто пройшли ТО вчасно ✓</p>';
        return;
    }
    el.innerHTML = `
        <table class="data">
            <thead>
                <tr><th>Авто</th><th>Пробіг</th><th>До ТО</th><th>Статус</th></tr>
            </thead>
            <tbody>
                ${cars.map(c => {
                    const overdue = c.km_remaining <= 0;
                    return `
                        <tr class="${overdue ? 'warn-row' : ''}">
                            <td><strong>${c.brand} ${c.model}</strong>
                                ${c.license_plate}</td>
                            <td>${(+c.mileage_km).toLocaleString('uk-UA')} км</td>
                            <td>${overdue
                                ? 'Прострочено на ' + Math.abs(c.km_remaining) + ' км'
                                : c.km_remaining + ' км'}</td>
                            <td><span class="badge badge--${overdue ? 'cancelled' : 'pending'}">
                                ${overdue ? 'ТЕРМІНОВО' : 'Скоро'}
                            </span></td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function renderRisk(users) {
    const el = document.getElementById('risk-table');
    if (!users.length) {
        el.innerHTML = '<p style="color:#a8a097;padding:20px;">Підозрілих не виявлено.</p>';
        return;
    }
    el.innerHTML = `
        <table class="data">
            <thead>
                <tr>
                    <th>Користувач</th><th>Бронювань</th>
                    <th>Скасувань</th><th>% відмов</th>
                    <th>Статус</th><th></th>
                </tr>
            </thead>
            <tbody>
                ${users.map(u => `
                    <tr class="${u.cancel_rate >= 50 ? 'warn-row' : ''}">
                        <td>
                            <strong>${u.full_name}</strong><br>
                            <span style="color:#6b665e;font-size:.8em">${u.email}</span>
                        </td>
                        <td>${u.total_bookings}</td>
                        <td>${u.cancelled_bookings}</td>
                        <td><strong style="color:${u.cancel_rate >= 50 ? '#c47878' : '#d4a574'}">
                            ${u.cancel_rate}%
                        </strong></td>
                        <td>${u.is_banned
                            ? '<span class="badge badge--banned">Забанено</span>'
                            : '<span class="badge badge--ok">Активний</span>'}</td>
                        <td>
                            <button class="btn-small ${u.is_banned ? '' : 'danger'}"
                                onclick="toggleBan(${u.id})">
                                ${u.is_banned ? 'Розбанити' : 'Забанити'}
                            </button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function renderCity(rows) {
    document.getElementById('city-table').innerHTML = `
        <table class="data">
            <thead><tr><th>Місто</th><th>Бронювань</th><th>Дохід</th></tr></thead>
            <tbody>
                ${rows.map(r => `
                    <tr>
                        <td>${r.city}</td>
                        <td>${r.bookings}</td>
                        <td>${fmt.money(r.revenue)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function toggleBan(userId) {
    if (!confirm('Змінити статус бану?')) return;
    await api.post(`/admin/users/${userId}/ban`);
    loadDashboard();
}

async function runCronNow() {
    if (!confirm('Запустити перерахунок зараз?')) return;
    await api.post('/admin/run-cron');
    alert('Готово. Дані оновлено.');
    loadDashboard();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('kpi-grid')) {
        loadDashboard();
        document.getElementById('run-cron-btn')
            ?.addEventListener('click', runCronNow);
    }
});