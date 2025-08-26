// routes/permisos.routes.js
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

// --- Helpers de autorización ---
function allowRoles(...roles){
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role || !roles.includes(role)) {
      return res.status(403).json({ ok:false, message:'Sin permiso' });
    }
    next();
  };
}
function getEmailFromSession(req){
  const u = req.session?.user || {};
  const cand = [u.email, u.username, u.user, u.correo, u.mail]
    .filter(v => typeof v === 'string' && v.trim());
  return (cand[0] || '').toLowerCase();
}
const CAN_DELETE_SET = new Set(['sandra2025@gmail.com','alejandra2025@gmail.com']);

/* ================== LISTAR (admin y user) ================== */
router.get('/', allowRoles('admin','user'), async (req, res) => {
  try {
    const { q = '', from = '', to = '', docente = '' } = req.query;

    const where = [];
    const params = [];

    if (docente) {
      where.push('p.docente_codigo = ?');
      params.push(docente);
    } else {
      if (from && to){ where.push('p.fecha_desde >= ? AND p.fecha_hasta <= ?'); params.push(from, to); }
      else if (from){  where.push('p.fecha_desde >= ?'); params.push(from); }
      else if (to){    where.push('p.fecha_hasta <= ?'); params.push(to); }
    }

    if (q){
      const like = `%${q}%`;
      where.push('(p.docente_codigo LIKE ? OR d.nombres LIKE ? OR d.apellidos LIKE ?)');
      params.push(like, like, like);
    }

    const sql = `
      SELECT  p.id, p.docente_codigo, p.tipo, p.fecha_desde, p.fecha_hasta,
              p.observaciones, p.creado_en,
              p.estado, p.aprobado_por, p.aprobado_en,
              d.nombres, d.apellidos
      FROM permisos p
      JOIN docentes d ON d.codigo = p.docente_codigo
      ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
      ORDER BY p.creado_en DESC, p.id DESC
    `;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al listar permisos' });
  }
});

/* ================== CREAR (solo users) ================== */
router.post('/', allowRoles('user'), async (req, res) => {
  try {
    const { docente_codigo, tipo, fecha_desde, fecha_hasta, observaciones } = req.body || {};
    if (!docente_codigo || !tipo || !fecha_desde || !fecha_hasta){
      return res.status(400).json({ ok:false, message:'Faltan campos obligatorios' });
    }
    if (new Date(fecha_hasta) < new Date(fecha_desde)){
      return res.status(400).json({ ok:false, message:'El rango de fechas es inválido' });
    }

    const creado_por = req.session?.user?.id ?? null;

    await pool.query(
      `INSERT INTO permisos (docente_codigo, tipo, fecha_desde, fecha_hasta, observaciones, creado_por)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [docente_codigo, tipo, fecha_desde, fecha_hasta, observaciones || null, creado_por]
    );

    res.json({ ok:true, message:'Permiso registrado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al crear permiso' });
  }
});

/* ================== CAMBIAR ESTADO (solo admin) ================== */
router.patch('/:id/estado', allowRoles('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body || {};
    if (!['aprobado', 'rechazado'].includes(estado)){
      return res.status(400).json({ ok:false, message:'Estado inválido' });
    }

    const aprobador = req.session?.user?.id ?? null;

    const [r] = await pool.query(
      `UPDATE permisos
         SET estado = ?, aprobado_por = ?, aprobado_en = NOW()
       WHERE id = ?`,
      [estado, aprobador, id]
    );

    if (!r.affectedRows) return res.status(404).json({ ok:false, message:'Permiso no encontrado' });

    res.json({ ok:true, message:`Permiso ${estado}` });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al actualizar estado' });
  }
});

/* ================== ELIMINAR (solo Sandra/Alejandra) ================== */
router.delete('/:id', allowRoles('user','admin'), async (req, res) => {
  try {
    const email = getEmailFromSession(req);
    // Log de diagnóstico (puedes comentarlo si quieres)
    console.log('[DELETE permisos] email=', email);

    if (!CAN_DELETE_SET.has(email)) {
      return res.status(403).json({ ok:false, message:'No autorizado para eliminar permisos' });
    }

    const { id } = req.params;
    const [r] = await pool.query('DELETE FROM permisos WHERE id = ?', [id]);

    if (!r.affectedRows) return res.status(404).json({ ok:false, message:'Permiso no encontrado' });

    res.json({ ok:true, message:'Permiso eliminado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al eliminar permiso' });
  }
});

export default router;
