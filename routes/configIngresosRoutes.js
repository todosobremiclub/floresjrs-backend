// routes/configIngresosRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

/**
 * TIPOS DE INGRESO
 * GET /config/tipos-ingreso
 * POST /config/tipos-ingreso
 * PUT /config/tipos-ingreso/:id
 * DELETE /config/tipos-ingreso
 */

// GET
router.get('/tipos-ingreso', verificarToken, async (_req, res) => {
  try {
    const r = await db.query(
      'SELECT id, nombre, activo FROM tipos_ingreso ORDER BY nombre ASC'
    );
    res.json(r.rows);
  } catch (err) {
    console.error('❌ Error al obtener tipos de ingreso:', err);
    res.status(500).json({ error: 'Error al obtener tipos de ingreso' });
  }
});

// POST
router.post('/tipos-ingreso', verificarToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'Nombre inválido' });
    }

    const r = await db.query(
      'INSERT INTO tipos_ingreso (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
    );
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un tipo con ese nombre' });
    }
    console.error('❌ Error al crear tipo de ingreso:', err);
    res.status(500).json({ error: 'Error al crear tipo de ingreso' });
  }
});

// PUT
router.put('/tipos-ingreso/:id', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nombre } = req.body;

    if (!id || !nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }

    const r = await db.query(
      'UPDATE tipos_ingreso SET nombre = $1 WHERE id = $2 RETURNING *',
      [nombre.trim(), id]
    );
    res.json(r.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un tipo con ese nombre' });
    }
    console.error('❌ Error al actualizar tipo de ingreso:', err);
    res.status(500).json({ error: 'Error al actualizar tipo de ingreso' });
  }
});

// DELETE (soft)
router.delete('/tipos-ingreso', verificarToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    await db.query(
      'UPDATE tipos_ingreso SET activo = false WHERE id = $1',
      [id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('❌ Error al eliminar tipo de ingreso:', err);
    res.status(500).json({ error: 'Error al eliminar tipo de ingreso' });
  }
});

module.exports = router;