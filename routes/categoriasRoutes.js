const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET - Obtener todas las categorías
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query('SELECT id, nombre FROM categorias ORDER BY nombre');
    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al obtener categorías:', err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// POST - Agregar nueva categoría
router.post('/', verificarToken, async (req, res) => {
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Falta el nombre' });

  try {
    await db.query('INSERT INTO categorias (nombre) VALUES ($1)', [nombre]);
    res.status(201).json({ mensaje: 'Categoría guardada' });
  } catch (err) {
    console.error('❌ Error al guardar categoría:', err);
    res.status(500).json({ error: 'Error al guardar categoría' });
  }
});

// DELETE - Eliminar categoría por ID
router.delete('/', verificarToken, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'Falta el ID' });

  try {
    await db.query('DELETE FROM categorias WHERE id = $1', [id]);
    res.json({ mensaje: 'Categoría eliminada' });
  } catch (err) {
    console.error('❌ Error al eliminar categoría:', err);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

// PUT - Actualizar nombre de categoría por ID
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { nombre } = req.body;
  if (!nombre) return res.status(400).json({ error: 'Falta el nuevo nombre' });

  try {
    await db.query('UPDATE categorias SET nombre = $1 WHERE id = $2', [nombre, id]);
    res.json({ mensaje: 'Categoría actualizada' });
  } catch (err) {
    console.error('❌ Error al actualizar categoría:', err);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// GET - Obtener años únicos de nacimiento desde socios
router.get('/anios', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT DISTINCT EXTRACT(YEAR FROM fecha_nacimiento)::INT AS anio
      FROM socios
      WHERE fecha_nacimiento IS NOT NULL
      ORDER BY anio DESC
    `);
    res.json(resultado.rows.map(row => row.anio));
  } catch (err) {
    console.error('❌ Error al obtener años:', err);
    res.status(500).json({ error: 'Error al obtener años' });
  }
});

module.exports = router;


