// routes/carnets.routes.js
import { Router } from "express";
import pool from "../db.js";

const router = Router();

/** GET /api/carnets?search=...  (listar con búsqueda opcional) */
router.get("/", async (req, res) => {
  try {
    const q = (req.query.search || "").trim();
    let sql = `
      SELECT c.id, c.docente_codigo, c.dpi, c.barcode_value,
             DATE_FORMAT(c.creado_en, '%Y-%m-%d %H:%i') AS creado_en,
             d.nombres, d.apellidos
      FROM carnets c
      JOIN docentes d ON d.codigo = c.docente_codigo
    `;
    const params = [];
    if (q) {
      sql += ` WHERE c.dpi LIKE ? OR c.docente_codigo LIKE ? OR d.nombres LIKE ? OR d.apellidos LIKE ? `;
      const like = `%${q}%`;
      params.push(like, like, like, like);
    }
    sql += ` ORDER BY c.creado_en DESC `;
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al listar carnets' });
  }
});

/** POST /api/carnets  (crear) */
router.post("/", async (req, res) => {
  try {
    const { docente_codigo, dpi } = req.body || {};
    if (!docente_codigo || !dpi) {
      return res.status(400).json({ ok:false, message:'Faltan datos (docente_codigo, dpi)' });
    }
    if (!/^\d{13}$/.test(dpi)) {
      return res.status(400).json({ ok:false, message:'El DPI debe tener exactamente 13 dígitos' });
    }

    // verificar que exista el docente
    const [doc] = await pool.query('SELECT codigo FROM docentes WHERE codigo=?', [docente_codigo]);
    if (!doc.length) return res.status(404).json({ ok:false, message:'Docente no encontrado' });

    const barcode_value = dpi; // usamos el DPI como valor de código de barras

    await pool.query(
      'INSERT INTO carnets (docente_codigo, dpi, barcode_value) VALUES (?,?,?)',
      [docente_codigo, dpi, barcode_value]
    );
    res.json({ ok:true, message:'Carnet creado' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok:false, message:'DPI o Docente ya tienen carnet' });
    }
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al crear carnet' });
  }
});

/** PUT /api/carnets/:id  (actualizar opcional) */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { docente_codigo, dpi } = req.body || {};

    const sets = [];
    const params = [];
    if (docente_codigo) {
      sets.push('docente_codigo=?');
      params.push(docente_codigo);
    }
    if (dpi) {
      if (!/^\d{13}$/.test(dpi)) {
        return res.status(400).json({ ok:false, message:'El DPI debe tener exactamente 13 dígitos' });
      }
      sets.push('dpi=?');
      params.push(dpi);
      sets.push('barcode_value=?');
      params.push(dpi);
    }
    if (!sets.length) return res.status(400).json({ ok:false, message:'Nada para actualizar' });

    params.push(id);
    await pool.query(`UPDATE carnets SET ${sets.join(', ')} WHERE id=?`, params);
    res.json({ ok:true, message:'Carnet actualizado' });
  } catch (e) {
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ ok:false, message:'DPI o Docente ya usado en otro carnet' });
    }
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al actualizar' });
  }
});

/** DELETE /api/carnets/:id */
router.delete("/:id", async (req, res) => {
  try {
    await pool.query('DELETE FROM carnets WHERE id=?', [req.params.id]);
    res.json({ ok:true, message:'Carnet eliminado' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok:false, message:'Error al eliminar' });
  }
});

export default router;
