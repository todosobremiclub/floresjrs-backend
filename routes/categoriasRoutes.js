const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET - Obtener todas las categorías
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM categorias ORDER BY nombre');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Error al obtener categorías:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST - Agregar nueva categoría
router.post('/', verificarToken, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    await db.query('INSERT INTO categorias (nombre) VALUES ($1)', [nombre]);
    res.status(201).json({ mensaje: 'Categoría agregada correctamente' });
  } catch (err) {
    console.error('❌ Error al agregar categoría:', err);
    res.status(500).json({ error: 'Error al agregar categoría' });
  }
});

// DELETE - Eliminar una categoría
router.delete('/', verificarToken, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Nombre requerido' });

  try {
    await db.query('DELETE FROM categorias WHERE nombre = $1', [nombre]);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (err) {
    console.error('❌ Error al eliminar categoría:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

module.exports = router;
