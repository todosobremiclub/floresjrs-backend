const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

/**
 * TIPOS DE GASTO
 * GET    /config/tipos-gasto
 * POST   /config/tipos-gasto            body: { nombre }
 * PUT    /config/tipos-gasto/:id        body: { nombre }
 * DELETE /config/tipos-gasto            body: { id }
 */
router.get('/tipos-gasto', verificarToken, async (_req, res) => {
  try {
    const r = await db.query(
      'SELECT id, nombre, activo FROM public.tipos_gasto ORDER BY nombre ASC'
    );
    res.json(r.rows);
  } catch (err) {
    console.error('❌ Error al obtener tipos de gasto:', err);
    res.status(500).json({ error: 'Error al obtener tipos de gasto' });
  }
});

router.post('/tipos-gasto', verificarToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'Nombre inválido' });
    }

    const r = await db.query(
      'INSERT INTO public.tipos_gasto (nombre) VALUES ($1) RETURNING id, nombre, activo',
      [nombre.trim()]
    );

    res.status(201).json({ mensaje: 'Tipo de gasto agregado', tipo: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un tipo con ese nombre' });
    }
    console.error('❌ Error al crear tipo de gasto:', err);
    res.status(500).json({ error: 'Error al crear tipo de gasto' });
  }
});

router.put('/tipos-gasto/:id', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nombre } = req.body;

    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre inválido' });

    const r = await db.query(
      'UPDATE public.tipos_gasto SET nombre = $1 WHERE id = $2 RETURNING id, nombre, activo',
      [nombre.trim(), id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: 'Tipo no encontrado' });
    res.json({ mensaje: 'Tipo actualizado', tipo: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un tipo con ese nombre' });
    }
    console.error('❌ Error al actualizar tipo de gasto:', err);
    res.status(500).json({ error: 'Error al actualizar tipo de gasto' });
  }
});

router.delete('/tipos-gasto', verificarToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    // Si está en uso, lo desactivamos (evitamos romper FK/historial)
    const uso = await db.query('SELECT 1 FROM public.gastos WHERE tipo_id = $1 LIMIT 1', [id]);
    if (uso.rowCount > 0) {
      await db.query('UPDATE public.tipos_gasto SET activo = FALSE WHERE id = $1', [id]);
      return res.json({ mensaje: 'Tipo desactivado (estaba en uso)' });
    }

    const r = await db.query('DELETE FROM public.tipos_gasto WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Tipo no encontrado' });

    res.json({ mensaje: 'Tipo eliminado' });
  } catch (err) {
    console.error('❌ Error al eliminar tipo de gasto:', err);
    res.status(500).json({ error: 'Error al eliminar tipo de gasto' });
  }
});

/**
 * RESPONSABLES DE GASTO
 * GET    /config/responsables-gasto
 * POST   /config/responsables-gasto     body: { nombre }
 * PUT    /config/responsables-gasto/:id body: { nombre }
 * DELETE /config/responsables-gasto     body: { id }
 */
router.get('/responsables-gasto', verificarToken, async (_req, res) => {
  try {
    const r = await db.query(
      'SELECT id, nombre, activo FROM public.responsables_gasto ORDER BY nombre ASC'
    );
    res.json(r.rows);
  } catch (err) {
    console.error('❌ Error al obtener responsables:', err);
    res.status(500).json({ error: 'Error al obtener responsables' });
  }
});

router.post('/responsables-gasto', verificarToken, async (req, res) => {
  try {
    const { nombre } = req.body;
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre inválido' });

    const r = await db.query(
      'INSERT INTO public.responsables_gasto (nombre) VALUES ($1) RETURNING id, nombre, activo',
      [nombre.trim()]
    );

    res.status(201).json({ mensaje: 'Responsable agregado', responsable: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un responsable con ese nombre' });
    }
    console.error('❌ Error al crear responsable:', err);
    res.status(500).json({ error: 'Error al crear responsable' });
  }
});

router.put('/responsables-gasto/:id', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { nombre } = req.body;

    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
    if (!nombre || !nombre.trim()) return res.status(400).json({ error: 'Nombre inválido' });

    const r = await db.query(
      'UPDATE public.responsables_gasto SET nombre = $1 WHERE id = $2 RETURNING id, nombre, activo',
      [nombre.trim(), id]
    );

    if (r.rowCount === 0) return res.status(404).json({ error: 'Responsable no encontrado' });
    res.json({ mensaje: 'Responsable actualizado', responsable: r.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Ya existe un responsable con ese nombre' });
    }
    console.error('❌ Error al actualizar responsable:', err);
    res.status(500).json({ error: 'Error al actualizar responsable' });
  }
});

router.delete('/responsables-gasto', verificarToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID requerido' });

    // Si está en uso, desactivamos
    const uso = await db.query('SELECT 1 FROM public.gastos WHERE responsable_id = $1 LIMIT 1', [id]);
    if (uso.rowCount > 0) {
      await db.query('UPDATE public.responsables_gasto SET activo = FALSE WHERE id = $1', [id]);
      return res.json({ mensaje: 'Responsable desactivado (estaba en uso)' });
    }

    const r = await db.query('DELETE FROM public.responsables_gasto WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Responsable no encontrado' });

    res.json({ mensaje: 'Responsable eliminado' });
  } catch (err) {
    console.error('❌ Error al eliminar responsable:', err);
    res.status(500).json({ error: 'Error al eliminar responsable' });
  }
});

module.exports = router;
