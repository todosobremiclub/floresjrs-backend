const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // sin almacenamiento local, recibimos buffer
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');
const subirImagen = require('../utils/subirAFirebase'); // 👈 subida a Firebase

// POST /noticias → publicar novedad con texto, imagen y filtros de destino
router.post('/', verificarToken, upload.single('imagen'), async (req, res) => {
  try {
    const { titulo, texto, destino, categorias } = req.body;

    if (!titulo || !texto || !destino) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // ✅ Validación obligatoria de categoría si destino lo requiere
    let categoriasStr = null;
    if (destino === 'categoria') {
      if (!categorias) {
        return res.status(400).json({ error: 'Debe seleccionar al menos una categoría' });
      }

      try {
        const categoriasArray = JSON.parse(categorias);
        if (!Array.isArray(categoriasArray) || categoriasArray.length === 0) {
          return res.status(400).json({ error: 'Debe seleccionar al menos una categoría' });
        }

        categoriasStr = categoriasArray.join(',');
      } catch (err) {
        return res.status(400).json({ error: 'Formato de categorías inválido' });
      }
    }

    let imagen_url = null;
    if (req.file) {
      const subida = await subirImagen(req.file.buffer, req.file.originalname);
      imagen_url = subida.url;
    }

    await db.query(`
      INSERT INTO noticias (titulo, texto, imagen_url, destino, categoria)
      VALUES ($1, $2, $3, $4, $5)
    `, [titulo, texto, imagen_url, destino, categoriasStr]);

    res.json({ mensaje: 'Novedad publicada' });
  } catch (err) {
    console.error('❌ Error al publicar novedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /noticias → listar todas las noticias
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT 
        id,
        titulo,
        texto,
        imagen_url,
        destino,
        categoria,
        fecha
      FROM noticias
      ORDER BY fecha DESC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al listar noticias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /noticias/:id → editar novedad
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const { titulo, texto } = req.body;

  if (!titulo || !texto) {
    return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
    await db.query(`
      UPDATE noticias
      SET titulo = $1,
          texto = $2
      WHERE id = $3
    `, [titulo, texto, id]);

    res.json({ mensaje: 'Novedad actualizada correctamente' });
  } catch (err) {
    console.error('❌ Error al editar novedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /noticias/:id → eliminar novedad
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    await db.query('DELETE FROM noticias WHERE id = $1', [id]);
    res.json({ mensaje: 'Novedad eliminada correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar novedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
