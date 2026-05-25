const { Pool } = require('pg'); 
require ('dotenv').config(); 

const pool = new Pool({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 5432,
    database: process.env.DB_NAME     || 'drivex',
    user:     process.env.DB_USER     || 'postgres',
    password: process.env.DB_PASSWORD || '',
		max : 20, 
		idleTimeoutMillis: 30000, 
		connectionTimeoutMillis: 5000
});

pool.on('error', (err) => {
	console.error('ПОмилка пулу PostgreSQL;' , err);

});

async function query(text, params) {
	const start = Date.now();
	const res = await pool.query(text, params);
	const ms = Date.now() - start;
	if (ms< 200) {
		console.warn('[Повільний запит] ${ms}мс]' , text.substring(0, 80));

	}
	return res;
}

module.exports = { pool, query};