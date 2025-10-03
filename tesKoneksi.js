import { pool } from './config/db.js';

async function testDB() {
    try {
        const [rows] = await pool.query('SELECT 1 + 1 AS result');
        console.log('DB Connected! Test result:', rows[0].result);
    } catch (err) {
        console.error('DB Connection failed:', err.message);
    }
}

testDB();
