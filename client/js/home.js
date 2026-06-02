async function loadHomeData() {
    try {
        const { cars } = await api.get('/cars?sort=popular');
        renderCarsGrid(cars.slice(0, 8), '#popular-cars');
    } catch (e) {
        console.error(e);
    }

    try {
        const { locations } = await api.get('/cars/locations');
        const cities = [...new Set(locations.map(l => l.city))];
        const sel = document.getElementById('search-city');
        if (sel) {
            cities.forEach(c => {
                const o = document.createElement('option');
                o.value = c;
                o.textContent = c;
                sel.appendChild(o);
            });
        }
    } catch (e) {
        console.error(e);
    }
}

function carCardHTML(car) {
    const img = car.image_url
        ? `<img src="${car.image_url}" alt="${car.brand} ${car.model}"
               onerror="this.parentElement.innerHTML=placeholderSVG()">`
        : placeholderSVG();

    return `
        <article class="car-card" data-id="${car.id}">
            <div class="car-card__img">
                ${img}
                <span class="car-card__tag">${car.body_type || ''}</span>
            </div>
            <div class="car-card__body">
                <div class="car-card__brand">${car.brand}</div>
                <div class="car-card__model">${car.model}</div>
                <div class="car-card__meta">
                    <span>${car.year}</span>
                    <span>${car.transmission}</span>
                    <span>${car.fuel_type}</span>
                    <span>${car.seats} місць</span>
                </div>
                <div class="car-card__footer">
                    <div class="car-card__price">
                        ${fmt.money(car.price_per_day)}<small>/ ДЕНЬ</small>
                    </div>
                    <button class="btn-small"
                        onclick="event.stopPropagation();bookCar(${car.id})">
                        Орендувати
                    </button>
                </div>
            </div>
        </article>
    `;
}

function placeholderSVG() {
    return `
        <svg viewBox="0 0 200 110" xmlns="http://www.w3.org/2000/svg"
             stroke="currentColor" stroke-width="1.5" fill="none"
             style="width:60%;opacity:.3;">
            <path d="M20,80 L20,60 Q20,55 25,52 L55,40 Q60,38 65,38
                     L135,38 Q145,38 155,45 L175,60 Q180,62 180,68 L180,80"/>
            <line x1="20" y1="80" x2="180" y2="80"/>
            <circle cx="50" cy="80" r="10"/>
            <circle cx="150" cy="80" r="10"/>
        </svg>
    `;
}

function renderCarsGrid(cars, selector) {
    const root = document.querySelector(selector);
    if (!root) return;
    if (!cars.length) {
        root.innerHTML = '<p style="color:#a8a097;text-align:center;padding:40px;grid-column:1/-1;">Авто не знайдено</p>';
        return;
    }
    root.innerHTML = cars.map(carCardHTML).join('');
    root.querySelectorAll('.car-card').forEach(card => {
        card.addEventListener('click', () => bookCar(card.dataset.id));
    });
}

function bookCar(carId) {
    if (!window.currentUser) {
        location.href = `/login.html?redirect=${encodeURIComponent(location.pathname)}`;
        return;
    }

    const today    = new Date().toISOString().split('T')[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    document.body.insertAdjacentHTML('beforeend', `
        <div class="modal-backdrop" id="book-modal">
            <div class="modal">
                <h3>Оформлення оренди</h3>
                <div class="field">
                    <label>Дата отримання</label>
                    <input type="date" id="bk-start" value="${today}" min="${today}">
                </div>
                <div class="field">
                    <label>Дата повернення</label>
                    <input type="date" id="bk-end" value="${tomorrow}" min="${today}">
                </div>
                <div class="total" id="bk-total">—</div>
                <div id="bk-error" style="color:#c47878;font-size:.85rem;min-height:20px;"></div>
                <div class="actions">
                    <button class="btn-ghost" onclick="closeBookModal()">Скасувати</button>
                    <button class="btn-primary" id="bk-submit">Підтвердити</button>
                </div>
                <p style="color:#a8a097;font-size:.8rem;margin-top:14px;text-align:center;">
                    Очікуйте дзвінок для підтвердження.
                </p>
            </div>
        </div>
    `);

    api.get(`/cars/${carId}`).then(({ car }) => {
        const recalc = () => {
            const s = new Date(document.getElementById('bk-start').value);
            const e = new Date(document.getElementById('bk-end').value);
            const days = Math.max(1, Math.ceil((e - s) / 86400000) + 1);
            document.getElementById('bk-total').textContent =
                `${fmt.money(car.price_per_day * days)} (${days} дн.)`;
        };
        document.getElementById('bk-start').addEventListener('change', recalc);
        document.getElementById('bk-end').addEventListener('change', recalc);
        recalc();

        document.getElementById('bk-submit').addEventListener('click', async () => {
            const errBox = document.getElementById('bk-error');
            errBox.textContent = '';
            try {
                await api.post('/bookings', {
                    car_id:     carId,
                    start_date: document.getElementById('bk-start').value,
                    end_date:   document.getElementById('bk-end').value,
                });
                closeBookModal();
                alert('Бронювання створено. Очікуйте дзвінок підтвердження.');
            } catch (e) {
                errBox.textContent = e.message;
            }
        });
    });
}

function closeBookModal() {
    document.getElementById('book-modal')?.remove();
}

async function loadCatalog() {
    const params  = new URLSearchParams(location.search);
    const filters = Object.fromEntries(params);
    const qs      = new URLSearchParams(filters).toString();

    const { cars } = await api.get('/cars' + (qs ? '?' + qs : ''));
    renderCarsGrid(cars, '#catalog-grid');

    const { locations } = await api.get('/cars/locations');
    const cities = [...new Set(locations.map(l => l.city))];
    const citySel = document.getElementById('f-city');
    if (citySel) {
        cities.forEach(c => {
            const o = document.createElement('option');
            o.value = c;
            o.textContent = c;
            if (filters.city === c) o.selected = true;
            citySel.appendChild(o);
        });
    }

    ['body_type', 'transmission', 'fuel_type', 'sort'].forEach(k => {
        const el = document.getElementById('f-' + k);
        if (el && filters[k]) el.value = filters[k];
    });
}

function applyFilters() {
    const params = new URLSearchParams();
    ['city', 'body_type', 'transmission', 'fuel_type', 'sort'].forEach(k => {
        const el = document.getElementById('f-' + k);
        if (el && el.value) params.set(k, el.value);
    });
    location.search = params.toString();
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('popular-cars')) loadHomeData();
    if (document.getElementById('catalog-grid')) loadCatalog();

    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const params = new URLSearchParams();
            const city = document.getElementById('search-city').value;
            if (city) params.set('city', city);
            location.href = '/catalog.html?' + params.toString();
        });
    }
});