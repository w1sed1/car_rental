let map = null;
let carLayer = null;
let locationLayer = null;

function initMap() {
    const root = document.getElementById('map');
    if (!root || typeof L === 'undefined') return;

    map = L.map('map').setView([49.0, 31.5], 6);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap, © CartoDB',
        subdomains: 'abcd',
        maxZoom: 19,
    }).addTo(map);

    locationLayer = L.layerGroup().addTo(map);
    carLayer      = L.layerGroup().addTo(map);

    loadLocations();
    loadLiveCars();
    setInterval(loadLiveCars, 10000);

    const findBtn = document.getElementById('find-nearest');
    if (findBtn) findBtn.addEventListener('click', findNearest);
}

async function loadLocations() {
    const { locations } = await api.get('/cars/locations');
    locationLayer.clearLayers();

    locations.forEach(l => {
        const icon = L.divIcon({
            className: '',
            html: `<div style="
                width:36px;height:36px;border-radius:50%;
                background:#2f6457;border:3px solid #ffffff;
                box-shadow:0 0 0 2px #2f6457,0 4px 16px rgba(0,0,0,.25);
                display:grid;place-items:center;
                color:#ffffff;font-weight:700;font-size:13px;
                font-family:'Manrope',system-ui,sans-serif;
            ">${l.city[0]}</div>`,
            iconSize: [36, 36],
            iconAnchor: [18, 18],
        });

        L.marker([l.lat, l.lng], { icon })
            .bindPopup(`<strong>${l.name}</strong><br>${l.address}<br><small>${l.city}</small>`)
            .addTo(locationLayer);
    });
}

async function loadLiveCars() {
    try {
        const { cars } = await api.get('/cars/live-gps');
        carLayer.clearLayers();

        cars.forEach(c => {
            if (!c.current_lat) return;
            const color = c.status === 'available' ? '#2f8f5b'
                        : c.status === 'rented'    ? '#2f6457'
                        : '#9aa0a6';

            const icon = L.divIcon({
                className: '',
                html: `<div style="
                    width:12px;height:12px;border-radius:50%;
                    background:${color};border:2px solid #ffffff;
                    box-shadow:0 0 8px ${color};
                "></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6],
            });

            L.marker([c.current_lat, c.current_lng], { icon })
                .bindPopup(`<strong>${c.brand} ${c.model}</strong><br>
                    <small>${c.license_plate} · ${c.status}</small>`)
                .addTo(carLayer);
        });
    } catch (e) {
        console.error('GPS помилка:', e);
    }
}

function findNearest() {
    if (!navigator.geolocation) {
        alert('Браузер не підтримує геолокацію');
        return;
    }
    navigator.geolocation.getCurrentPosition(async (pos) => {
        const { latitude, longitude } = pos.coords;

        L.circleMarker([latitude, longitude], {
            radius: 8,
            color: '#214a40',
            fillColor: '#2f6457',
            fillOpacity: 0.8,
        }).addTo(map).bindPopup('Ви тут').openPopup();

        const { locations } = await api.get(
            `/cars/nearby?lat=${latitude}&lng=${longitude}`
        );

        if (locations.length) {
            const nearest = locations[0];
            map.setView([nearest.lat, nearest.lng], 12);
            alert(`Найближча станція: ${nearest.name} (${nearest.distance_km} км)`);
        } else {
            alert('Локацій поблизу не знайдено');
        }
    }, () => {
        alert('Не вдалося визначити геопозицію');
    });
}

document.addEventListener('DOMContentLoaded', initMap);