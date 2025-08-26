// db.js
import mysql from 'mysql2/promise';
import 'dotenv/config';

const {
  DB_HOST,
  DB_PORT = 3306,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_SSL // "true" si tu proveedor lo exige
} = process.env;

const ssl =
  String(DB_SSL).toLowerCase() === 'true'
    ? { rejectUnauthorized: false }
    : undefined;

const pool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl
});

export default pool;
