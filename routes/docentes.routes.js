// routes/docentes.routes.js
import { Router } from 'express';
import pool from '../db.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    let sql = 'SELECT * FROM docentes';
    let params = [];
    if (q) {
      sql += ' WHERE codigo LIKE ? OR nombres LIKE ? OR apellidos LIKE ?';
      const like = `%${q}%`;
      params = [like, like, like];
    }
    sql += ' ORDER BY apellidos, nombres';
    const [rows] = await pool.query(sql, params);
    res.json({ ok:true, data: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, message:'Error al listar docentes' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { codigo, nombres, apellidos, fechaNacimiento, telefono, email, anioIngreso } = req.body;
    if (!codigo || !nombres || !apellidos || !fechaNacimiento || !anioIngreso) {
      return res.status(400).json({ ok:false, message:'Campos obligatorios faltantes' });
    }
    const [exist] = await pool.query('SELECT 1 FROM docentes WHERE codigo=?', [codigo]);
    if (exist.length) return res.status(409).json({ ok:false, message:'El código ya existe' });

    await pool.query(
      `INSERT INTO docentes (codigo, nombres, apellidos, fecha_nacimiento, telefono, correo, anio_ingreso)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [codigo, nombres, apellidos, fechaNacimiento, telefono || null, email || null, anioIngreso]
    );
    res.json({ ok:true, message:'Docente creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, message:'Error al crear docente' });
  }
});

router.put('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    const { nombres, apellidos, fechaNacimiento, telefono, email, anioIngreso } = req.body;
    await pool.query(
      `UPDATE docentes SET
        nombres=?, apellidos=?, fecha_nacimiento=?, telefono=?, correo=?, anio_ingreso=?
       WHERE codigo=?`,
      [nombres, apellidos, fechaNacimiento, telefono || null, email || null, anioIngreso, codigo]
    );
    res.json({ ok:true, message:'Docente actualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, message:'Error al actualizar docente' });
  }
});

router.delete('/:codigo', async (req, res) => {
  try {
    const { codigo } = req.params;
    await pool.query('DELETE FROM docentes WHERE codigo=?', [codigo]);
    res.json({ ok:true, message:'Docente eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok:false, message:'Error al eliminar docente' });
  }
});

router.get('/min', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT codigo, CONCAT(nombres, ' ', apellidos) AS nombre
       FROM docentes
       ORDER BY apellidos, nombres`
    );
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, message: 'Error al obtener docentes' });
  }
});

export default router;
