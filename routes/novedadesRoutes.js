const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer(); // sin almacenamiento local, recibimos buffer
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');
const subirAImgur = require('../utils/subirAImgur');

// POST /novedades → publicar novedad con texto, imagen y filtros de destino
router.post('/', verificarToken, upload.single('imagen'), async (req, res) => {
  try {
    const { texto, destino, categoria, anio_nacimiento } = req.body;
    if (!texto || !destino) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    let imagen_url = null;
    if (req.file) {
      const subida = await subirAImgur(req.file.buffer);
      imagen_url = subida.url;
    }

    await db.query(`
      INSERT INTO novedades (texto, imagen_url, destino, categoria, anio_nacimiento)
      VALUES ($1, $2, $3, $4, $5)
    `, [texto, imagen_url, destino, categoria || null, anio_nacimiento || null]);

    res.json({ mensaje: 'Novedad publicada' });
  } catch (err) {
    console.error('❌ Error al publicar novedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /novedades → listar todas las novedades
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT 
        id,
        texto,
        imagen_url,
        destino,
        categoria,
        anio_nacimiento,
        fecha
      FROM novedades
      ORDER BY fecha DESC
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al listar novedades:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;


