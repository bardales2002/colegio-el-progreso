// server.js
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import session from 'express-session';
import bcrypt from 'bcrypt';
import mysqlSession from 'express-mysql-session';   // <— importa el wrapper CJS

import pool from './db.js';

// Rutas API
import docentesRoutes from './routes/docentes.routes.js';
import carnetsRoutes from './routes/carnets.routes.js';
import asistenciasRoutes from './routes/asistencias.routes.js';
import permisosRoutes from './routes/permisos.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const {
  PORT = 3000,
  SESSION_SECRET = 'cambia-esto-por-un-secreto-largo',
  NODE_ENV = 'development',
  DB_HOST,
  DB_PORT = 3306,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
} = process.env;

const app = express();

/* ================= Seguridad / proxy / cookies ================= */
app.disable('x-powered-by');
// En Render/Railway el tráfico llega tras un proxy → necesario para que "secure" funcione
app.set('trust proxy', 1);

/* ================= Middlewares básicos ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= Sesiones en MySQL ================= */
const MySQLStore = mysqlSession(session);
const store = new MySQLStore(
  {
    host: DB_HOST,
    port: Number(DB_PORT),
    user: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    createDatabaseTable: true, // crea automáticamente la tabla "sessions" si no existe
    schema: {
      tableName: 'sessions',
      columnNames: {
        session_id: 'sid',
        expires: 'expires',
        data: 'data',
      },
    },
    // Opcional: reduce escrituras cuando la sesión no cambia
    // clearExpired: true,
    // checkExpirationInterval: 900000, // 15 min
  }
);

app.use(
  session({
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store,
    cookie: {
      httpOnly: true,
      // Si el frontend va a estar en el mismo dominio (el Express sirve /public):
      sameSite: 'lax',
      // Si algún día sirves el frontend en otro dominio (Netlify) y usas cookies,
      // cambia a: sameSite: 'none', secure: true y configura CORS con credentials.
      secure: NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 4, // 4 horas
    },
  })
);

/* ================= Archivos estáticos ================= */
app.use(express.static(path.join(__dirname, 'public')));

/* ================= Rutas API ================= */
app.use('/api/docentes', docentesRoutes);
app.use('/api/carnets', carnetsRoutes);
app.use('/api/asistencias', asistenciasRoutes);
app.use('/api/permisos', permisosRoutes);

// Healthcheck para Render/Railway
app.get('/healthz', (_req, res) => res.status(200).send('OK'));

/* ================= Auth básica ================= */
function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.status(401).json({ ok: false, message: 'No autenticado' });
}

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ ok: false, message: 'Faltan credenciales' });
  }
  try {
    const [rows] = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = ?',
      [username]
    );
    const user = rows[0];
    if (!user) {
      return res.status(401).json({ ok: false, message: 'Usuario o contraseña incorrectos' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ ok: false, message: 'Usuario o contraseña incorrectos' });
    }

    req.session.user = { id: user.id, username: user.username, role: user.role };
    res.json({ ok: true, message: 'Login correcto' });
  } catch (err) {
    console.error('Error en /api/login:', err);
    res.status(500).json({ ok: false, message: 'Error del servidor' });
  }
});

app.get('/api/me', (req, res) => {
  if (req.session?.user) return res.json({ ok: true, user: req.session.user });
  res.status(200).json({ ok: false, user: null });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ ok: true, message: 'Sesión cerrada' });
  });
});

/* ================= HTML protegidos y fallback ================= */
app.get('/dashboard', requireAuth, (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Fallback SPA (index.html) — déjalo al final
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ================= Arranque ================= */
app.listen(PORT, () => {
  console.log(`✅ Servidor escuchando en http://localhost:${PORT}`);
  console.log(`   NODE_ENV=${NODE_ENV} | DB=${DB_NAME}@${DB_HOST}:${DB_PORT}`);
});
