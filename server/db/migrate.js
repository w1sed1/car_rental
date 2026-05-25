const fs = require('fs');
const path =require('path');
const { pool } = require('./index');

async function migrate() {
	const sql = fs.readFileSync(
		path.join(__dirname, 'schema.sql'),
		'utf-8'

	);
	try {
		console.log('Виконую міграцію...');
		await pool.query(sql);
		console.log('Готово. Схему створено.');

	} catch (e) {
		console.log('Помилка міграції:', e.message);
		process.exit(1);
	} finally {
		await pool.end();

	}
}
migrate();