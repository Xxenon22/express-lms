import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE

    // host: process.env.PG_HOST,
    // port: process.env.PG_PORT,
    // user: process.env.PG_USER,
    // password: process.env.PG_PASSWORD,
    // database: process.env.PG_DATABASE
});

console.log("Connecting to DB:", process.env.DB_HOST, process.env.DB_USER);

export { pool };
