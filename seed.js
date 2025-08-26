// seed.js
import 'dotenv/config';
import mysql from 'mysql2/promise';
import bcrypt from 'bcrypt';

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// Lista exacta de usuarios a crear
const USERS_TO_CREATE = [
  { username: 'daniel2025@gmail.com', password: 'Lopezsolis123.', role: 'admin' },
  { username: 'joseluis2025@gmail.com', password: 'Joseluis123.', role: 'admin' },
  { username: 'sandra2025@gmail.com', password: 'Sandraflores123.', role: 'user' },
  { username: 'alejandra2025@gmail.com', password: 'Alejandra123.', role: 'user' }
];

async function main() {
  const conn = await mysql.createConnection({
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME
  });

  // Eliminar todos los usuarios existentes
  await conn.execute('DELETE FROM users');

  // Insertar los nuevos usuarios
  for (const u of USERS_TO_CREATE) {
    const hash = await bcrypt.hash(u.password, 10);
    await conn.execute(
      'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
      [u.username, hash, u.role]
    );
    console.log(`✔ Usuario creado: ${u.username}`);
  }

  await conn.end();
  console.log('Base de datos actualizada con los nuevos usuarios.');
}

main().catch(console.error);
