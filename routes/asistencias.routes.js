// routes/asistencias.routes.js
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

/**
 * POST /api/asistencias/scan
 * Body: { dpi: "13 dígitos" }
 * Solo acepta DPIs que existan en carnets.
 *  - Si no hay registro hoy -> crea ENTRADA
 *  - Si ya hay y no tiene salida -> marca SALIDA
 *  - Si ya tiene salida -> responde "completo"
 */
router.post('/scan', async (req, res) => {
  try {
    const dpi = String(req.body?.dpi || '').replace(/\D/g, '');
    if (!/^\d{13}$/.test(dpi)) {
      return res.status(400).json({ ok:false, message:'DPI inválido (13 dígitos)' });
    }

    // Buscar DPI en carnets (solo permite los que YA existen)
    const [rows] = await pool.query(
      `SELECT c.docente_codigo, c.dpi,
              d.nombres, d.apellidos
       FROM carnets c
       JOIN docentes d ON d.codigo = c.docente_codigo
       WHERE c.dpi = ?`,
      [dpi]
    );
    const found = rows[0];
    if (!found) {
      return res.status(404).json({ ok:false, message:'Este DPI no tiene carnet registrado' });
    }

    const { docente_codigo, nombres, apellidos } = found;

    // ¿Ya hay asistencia hoy?
    const [asis] = await pool.query(
      `SELECT id, hora_entrada, hora_salida
       FROM asistencias
       WHERE docente_codigo = ? AND fecha = CURDATE()`,
      [docente_codigo]
    );

    if (asis.length === 0) {
      // Primera marca del día: ENTRADA
      await pool.query(
        `INSERT INTO asistencias (docente_codigo, dpi, fecha, hora_entrada)
         VALUES (?, ?, CURDATE(), CURTIME())`,
        [docente_codigo, dpi]
      );
      return res.json({
        ok:true, action:'entrada',
        docente:{ codigo:docente_codigo, nombres, apellidos },
        time: new Date().toLocaleTimeString()
      });
    }

    const rec = asis[0];
    if (!rec.hora_salida) {
      // Segunda marca: SALIDA
      await pool.query(
        `UPDATE asistencias
         SET hora_salida = CURTIME()
         WHERE id = ?`,
        [rec.id]
      );
      return res.json({
        ok:true, action:'salida',
        docente:{ codigo:docente_codigo, nombres, apellidos },
        time: new Date().toLocaleTimeString()
      });
    }

    // Ya tiene entrada y salida hoy
    return res.json({
      ok:false, action:'completo',
      message:'La asistencia de hoy ya está completa.',
      docente:{ codigo:docente_codigo, nombres, apellidos }
    });

  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al registrar asistencia' });
  }
});

/**
 * GET /api/asistencias?date=YYYY-MM-DD
 * GET /api/asistencias?from=YYYY-MM-DD&to=YYYY-MM-DD
 * Optional: &q=texto (nombre, código, dpi)
 */
router.get('/', async (req, res) => {
  try {
    const { date, from, to } = req.query;
    const q = (req.query.q || '').trim();

    let sql = `
      SELECT a.id, a.fecha, a.hora_entrada, a.hora_salida, a.creado_en,
             a.docente_codigo, a.dpi,
             d.nombres, d.apellidos
      FROM asistencias a
      JOIN docentes d ON d.codigo = a.docente_codigo
      WHERE 1=1
    `;
    const params = [];

    if (from && to) {
      sql += ` AND a.fecha BETWEEN ? AND ?`;
      params.push(from, to);
    } else {
      sql += ` AND a.fecha = ?`;
      params.push(date || new Date().toISOString().slice(0,10));
    }

    if (q) {
      sql += ` AND (
        a.dpi LIKE ? OR a.docente_codigo LIKE ? OR
        d.nombres LIKE ? OR d.apellidos LIKE ?
      )`;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }

    sql += ` ORDER BY a.fecha DESC, d.apellidos, d.nombres`;

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al listar asistencias' });
  }
});

/** (Opcional) eliminar fila */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM asistencias WHERE id = ?', [id]);
    res.json({ ok:true, message:'Asistencia eliminada' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'No se pudo eliminar' });
  }
});

export default router;
