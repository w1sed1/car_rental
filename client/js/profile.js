const STATUS_LABEL = {
    pending:   'Очікує підтвердження',
    confirmed: 'Підтверджено',
    active:    'Активне',
    completed: 'Завершене',
    cancelled: 'Скасоване',
};

async function loadMyBookings() {
    try {
        const { bookings } = await api.get('/bookings/my');
        const root = document.getElementById('bookings-list');

        if (!bookings.length) {
            root.innerHTML = `
                <p style="color:#a8a097;padding:40px;text-align:center;">
                    У вас ще немає бронювань.
                    <a href="/catalog.html" style="color:#d4a574;">Переглянути каталог</a>
                </p>
            `;
            return;
        }

        root.innerHTML = bookings.map(b => `
            <article class="booking-card">
                <div class="booking-card__info">
                    <div class="booking-card__brand">${b.brand} ${b.model}</div>
                    <div class="booking-card__plate">${b.license_plate || ''}</div>
                    <div class="booking-card__dates">
                        ${fmt.date(b.start_date)} — ${fmt.date(b.end_date)}
                    </div>
                    <div class="booking-card__loc">
                        ${b.pickup_name || ''} · ${b.city || ''}
                    </div>
                </div>
                <div class="booking-card__side">
                    <span class="badge badge--${b.status}">
                        ${STATUS_LABEL[b.status] || b.status}
                    </span>
                    <div class="booking-card__price">${fmt.money(b.total_price)}</div>
                    ${['pending','confirmed'].includes(b.status) ? `
                        <button class="btn-small danger"
                            onclick="cancelBooking(${b.id})">
                            Скасувати
                        </button>
                    ` : ''}
                </div>
            </article>
        `).join('');

    } catch (e) {
        if (e.status === 401) {
            location.href = '/login.html?redirect=/profile.html';
        }
    }
}

async function cancelBooking(id) {
    if (!confirm('Скасувати бронювання?\n\nЧасті скасування можуть призвести до бану акаунта.')) return;
    try {
        await api.post(`/bookings/${id}/cancel`);
        loadMyBookings();
    } catch (e) {
        alert(e.message);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('bookings-list')) loadMyBookings();
});