
const { query } = require('../db');


function toRad(deg) {
    return deg * Math.PI / 180;
}

// Формула Гаверсина — відстань між двома точками на сфері в км
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // радіус Землі
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}


async function findNearestLocations(lat, lng, limit = 5, radiusKm = 500) {
 
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)));

    
    const { rows } = await query(
        `SELECT id, name, address, city, lat, lng
         FROM locations
         WHERE lat BETWEEN $1 AND $2
           AND lng BETWEEN $3 AND $4`,
        [lat - latDelta, lat + latDelta, lng - lngDelta, lng + lngDelta]
    );


    const withDistance = rows.map(r => ({
        ...r,
        distance_km: +haversineKm(lat, lng, r.lat, r.lng).toFixed(2)
    }));

    
    withDistance.sort((a, b) => a.distance_km - b.distance_km);
    return withDistance.slice(0, limit);
}

module.exports = { haversineKm, findNearestLocations };