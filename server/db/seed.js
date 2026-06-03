const bcrypt = require('bcrypt');
const { pool } = require('./index');

const rand   = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const choice = (arr) => arr[rand(0, arr.length - 1)];
const daysAgo = (n) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
};

const LOCATIONS = [
    { name: 'DriveX Київ Центр',    address: 'вул. Хрещатик, 22',     city: 'Київ',       lat: 50.4501, lng: 30.5234 },
    { name: 'DriveX Київ Аеропорт', address: 'Аеропорт Бориспіль',    city: 'Київ',       lat: 50.3450, lng: 30.8947 },
    { name: 'DriveX Львів Центр',   address: 'просп. Свободи, 7',     city: 'Львів',      lat: 49.8397, lng: 24.0297 },
    { name: 'DriveX Одеса Порт',    address: 'вул. Дерибасівська, 1', city: 'Одеса',      lat: 46.4825, lng: 30.7233 },
    { name: 'DriveX Харків',        address: 'майдан Свободи, 5',     city: 'Харків',     lat: 49.9935, lng: 36.2304 },
    { name: 'DriveX Дніпро',        address: 'просп. Яворницького, 50', city: 'Дніпро',   lat: 48.4647, lng: 35.0462 },
    { name: 'DriveX Запоріжжя',     address: 'просп. Соборний, 100',  city: 'Запоріжжя', lat: 47.8388, lng: 35.1396 },
    { name: 'DriveX Вінниця',       address: 'вул. Соборна, 33',      city: 'Вінниця',   lat: 49.2331, lng: 28.4682 },
		{ name: 'Drivex Чернігів',       address: 'просп. Мируб, 15',     city: 'Чернігів',  lat: 51.4982, lng:31.2893},
];

const CARS = [
    { brand:'Renault',      model:'Clio',      year:2022, plate:'AA1234BB', body:'хетчбек',  trans:'manual', fuel:'бензин',  seats:5, price:850,  image:'/img/renault-clio.png' },
    { brand:'Skoda',        model:'Fabia',     year:2023, plate:'AA2345CC', body:'хетчбек',  trans:'manual', fuel:'бензин',  seats:5, price:900,  image:'/img/skoda-fabia.png' },
    { brand:'Toyota',       model:'Yaris',     year:2023, plate:'AA3456DD', body:'хетчбек',  trans:'auto',   fuel:'гібрид',  seats:5, price:1100, image:'/img/toyota-yaris.png' },
    { brand:'Volkswagen',   model:'Passat',    year:2022, plate:'AA4567EE', body:'седан',    trans:'auto',   fuel:'дизель',  seats:5, price:1500, image:'/img/vw-passat.png' },
    { brand:'Skoda',        model:'Octavia',   year:2023, plate:'AA5678FF', body:'ліфтбек',  trans:'auto',   fuel:'бензин',  seats:5, price:1400, image:'/img/skoda-octavia.png' },
    { brand:'Mazda',        model:'6',         year:2023, plate:'AA6789GG', body:'седан',    trans:'auto',   fuel:'бензин',  seats:5, price:1600, image:'/img/mazda-6.png' },
    { brand:'Toyota',       model:'Camry',     year:2024, plate:'AA7890HH', body:'седан',    trans:'auto',   fuel:'гібрид',  seats:5, price:1800, image:'/img/toyota-camry.png' },
    { brand:'BMW',          model:'5 Series',  year:2023, plate:'AA8901II', body:'седан',    trans:'auto',   fuel:'бензин',  seats:5, price:2800, image:'/img/bmw-5series.png' },
    { brand:'Mercedes-Benz',model:'E-Class',   year:2024, plate:'AA9012JJ', body:'седан',    trans:'auto',   fuel:'бензин',  seats:5, price:3200, image:'/img/mercedes-eclass.png' },
    { brand:'Audi',         model:'A6',        year:2023, plate:'AA0123KK', body:'седан',    trans:'auto',   fuel:'дизель',  seats:5, price:2900, image:'/img/audi-a6.png' },
    { brand:'Toyota',       model:'RAV4',      year:2023, plate:'AA1122LL', body:'кросовер', trans:'auto',   fuel:'гібрид',  seats:5, price:1900, image:'/img/toyota-rav4.png' },
    { brand:'Hyundai',      model:'Tucson',    year:2023, plate:'AA2233MM', body:'кросовер', trans:'auto',   fuel:'бензин',  seats:5, price:1700, image:'/img/hyundai-tucson.png' },
    { brand:'Mazda',        model:'CX-5',      year:2023, plate:'AA3344NN', body:'кросовер', trans:'auto',   fuel:'бензин',  seats:5, price:1800, image:'/img/mazda-cx5.png' },
    { brand:'BMW',          model:'X5',        year:2024, plate:'AA4455OO', body:'кросовер', trans:'auto',   fuel:'дизель',  seats:5, price:3500, image:'/img/bmw-x5.png' },
    { brand:'Tesla',        model:'Model 3',   year:2024, plate:'AA5566PP', body:'седан',    trans:'auto',   fuel:'електро', seats:5, price:2400, image:'/img/tesla-model3.png' },
    { brand:'Tesla',        model:'Model Y',   year:2024, plate:'AA6677QQ', body:'кросовер', trans:'auto',   fuel:'електро', seats:5, price:2700, image:'/img/tesla-modely.png' },
    { brand:'Volkswagen',   model:'ID.4',      year:2023, plate:'AA7788RR', body:'кросовер', trans:'auto',   fuel:'електро', seats:5, price:2200, image:'/img/vw-id4.png' },
    { brand:'Volkswagen',   model:'Multivan',  year:2022, plate:'AA8899SS', body:'мінівен',  trans:'auto',   fuel:'дизель',  seats:7, price:2600, image:'/img/vw-multivan.png' },
    { brand:'Mercedes-Benz',model:'V-Class',   year:2023, plate:'AA9900TT', body:'мінівен',  trans:'auto',   fuel:'дизель',  seats:7, price:3000, image:'/img/mercedes-vclass.png' },
    { brand:'Renault',      model:'Megane',    year:2022, plate:'AA1010UU', body:'хетчбек',  trans:'manual', fuel:'бензин',  seats:5, price:1000, image:'/img/renault-megane.png' },
    
];

const FIRST_NAMES = ['Олександр','Марія','Іван','Анна','Петро','Софія','Микола','Олена','Андрій','Катерина'];
const LAST_NAMES  = ['Шевченко','Коваленко','Бондаренко','Ткаченко','Кравченко','Олійник','Шевчук','Поліщук'];

async function seed() {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        console.log('Очищення таблиць...');
        await client.query('TRUNCATE gps_logs, maintenance, bookings, cars, locations, users RESTART IDENTITY CASCADE');

        console.log('Створення адміна...');
        const adminHash = await bcrypt.hash('admin123', 10);
        await client.query(
            `INSERT INTO users (email, phone, password_hash, full_name, role)
             VALUES ($1,$2,$3,$4,'admin')`,
            ['admin@drivex.ua', '+380501234567', adminHash, 'Адміністратор системи']
        );

        console.log('Створення користувачів...');
        const userIds = [];
        for (let i = 0; i < 30; i++) {
            const fn = choice(FIRST_NAMES);
            const ln = choice(LAST_NAMES);
            const hash = await bcrypt.hash('user123', 10);
            const r = await client.query(
                `INSERT INTO users (email, phone, password_hash, full_name)
                 VALUES ($1,$2,$3,$4) RETURNING id`,
                [`user${i+1}@example.com`, `+38050${rand(1000000,9999999)}`, hash, `${fn} ${ln}`]
            );
            userIds.push(r.rows[0].id);
        }

        console.log('Створення локацій...');
        const locationIds = [];
        for (const l of LOCATIONS) {
            const r = await client.query(
                `INSERT INTO locations (name, address, city, lat, lng)
                 VALUES ($1,$2,$3,$4,$5) RETURNING id`,
                [l.name, l.address, l.city, l.lat, l.lng]
            );
            locationIds.push(r.rows[0].id);
        }

        console.log('Створення авто...');
        const carIds = [];
        for (const c of CARS) {
            const locId   = choice(locationIds);
            const locIdx  = locationIds.indexOf(locId);
            const loc     = LOCATIONS[locIdx];
            const mileage = rand(5000, 95000);
            const lastOil = Math.max(0, mileage - rand(2000, 12000));
            const r = await client.query(
                `INSERT INTO cars
                   (brand, model, year, license_plate, body_type, transmission,
                    fuel_type, seats, price_per_day, location_id,
                    current_lat, current_lng, mileage_km, last_oil_change_km, image_url)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14, $15)
                 RETURNING id`,
                [c.brand, c.model, c.year, c.plate, c.body, c.trans,
                 c.fuel, c.seats, c.price, locId,
                 loc.lat + (Math.random()-0.5)*0.05,
                 loc.lng + (Math.random()-0.5)*0.05,
                 mileage, lastOil, c.image ?? null]
            );
            carIds.push(r.rows[0].id);
        }

        console.log('Створення бронювань...');
        const STATUSES = [
            {s:'completed',w:60},{s:'cancelled',w:18},
            {s:'active',w:8},{s:'confirmed',w:10},{s:'pending',w:4},
        ];
        const weightedPick = () => {
            let r = Math.random() * 100;
            for (const x of STATUSES) { if ((r -= x.w) <= 0) return x.s; }
            return 'completed';
        };

        for (let i = 0; i < 250; i++) {
            const userId   = choice(userIds);
            const carId    = choice(carIds);
            const carRow   = await client.query('SELECT price_per_day, location_id FROM cars WHERE id=$1', [carId]);
            const price    = parseFloat(carRow.rows[0].price_per_day);
            const locId    = carRow.rows[0].location_id;
            const daysOld  = rand(1, 180);
            const start    = daysAgo(daysOld);
            const end      = new Date(start);
            end.setDate(end.getDate() + rand(1, 7));
            const status   = weightedPick();
            const total    = price * rand(1, 7);
            const cancelled = status === 'cancelled' ? start : null;

            await client.query(
                `INSERT INTO bookings
                   (user_id, car_id, pickup_location, start_date, end_date,
                    total_price, status, cancelled_at, created_at)
                 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
                [userId, carId, locId, start, end, total, status, cancelled, daysAgo(daysOld)]
            );
        }

        console.log('Перерахунок лічильників...');
        await client.query(`
            UPDATE users u SET
                total_bookings     = sub.total,
                cancelled_bookings = sub.cancelled,
                cancel_rate        = CASE WHEN sub.total > 0
                                     THEN ROUND(sub.cancelled::NUMERIC / sub.total * 100, 2)
                                     ELSE 0 END
            FROM (
                SELECT user_id,
                       COUNT(*)                                   AS total,
                       COUNT(*) FILTER (WHERE status='cancelled') AS cancelled
                FROM bookings GROUP BY user_id
            ) sub WHERE u.id = sub.user_id
        `);

        await client.query(`
            UPDATE cars c SET total_rentals = sub.cnt
            FROM (
                SELECT car_id, COUNT(*) AS cnt FROM bookings
                WHERE status IN ('completed','active','confirmed')
                GROUP BY car_id
            ) sub WHERE c.id = sub.car_id
        `);

        console.log('GPS-логи...');
        for (const carId of carIds) {
            const c = await client.query('SELECT current_lat, current_lng FROM cars WHERE id=$1', [carId]);
            for (let k = 0; k < 10; k++) {
                await client.query(
                    `INSERT INTO gps_logs (car_id, lat, lng, speed_kmh, logged_at)
                     VALUES ($1,$2,$3,$4,$5)`,
                    [carId,
                     c.rows[0].current_lat + (Math.random()-0.5)*0.02,
                     c.rows[0].current_lng + (Math.random()-0.5)*0.02,
                     rand(0, 90), daysAgo(k)]
                );
            }
        }

        await client.query('REFRESH MATERIALIZED VIEW popular_cars');
        await client.query('COMMIT');

        console.log('✓ База даних заповнена.');
        console.log('  Адмін:      admin@drivex.ua / admin123');
        console.log('  Користувач: user1@example.com / user123');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Помилка seed:', e.message);
        console.error(e.stack);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

seed();