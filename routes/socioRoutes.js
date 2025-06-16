// socioRoutes.js con GET /:id y PUT /:id completos
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const axios = require('axios');
const upload = multer();

console.log("✅ socioRoutes.js se está ejecutando");

// GET /socio → obtener todos los socios (para el panel admin)
router.get('/', async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT 
         numero_socio AS numero,
         dni,
         nombre,
         apellido,
         subcategoria AS categoria,
         telefono,
         TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') AS nacimiento,
         TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso,
         foto_url,
         true AS activo
       FROM socios
       ORDER BY numero_socio ASC`
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al listar socios:', err);
    res.status(500).json({ error: 'Error al obtener socios' });
  }
});

// GET /socio/:numero/:dni → Buscar socio específico (Flutter)
router.get('/:numero/:dni', async (req, res) => {
  const { numero, dni } = req.params;

  try {
    const resultado = await db.query(
      `SELECT 
         numero_socio AS numero,
         dni,
         CONCAT(nombre, ' ', apellido) AS nombre,
         subcategoria AS categoria,
         EXTRACT(YEAR FROM fecha_nacimiento)::text AS nacimiento,
         TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') AS ingreso,
         'Activo' AS estado,
         foto_url AS "fotoUrl",
         'Flores Jrs' AS club
       FROM socios 
       WHERE numero_socio = $1 AND dni = $2`,
      [numero, dni]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('❌ Error al buscar socio:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /socio/:id → obtener un socio por número
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await db.query(
      `SELECT 
         numero_socio AS numero,
         dni,
         nombre,
         apellido,
         subcategoria AS categoria,
         telefono,
         TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') AS nacimiento,
         TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') AS ingreso,
         foto_url
       FROM socios
       WHERE numero_socio = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('❌ Error al buscar socio por ID:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /socio/:id → actualizar socio
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    numero_socio,
    dni,
    nombre,
    apellido,
    subcategoria,
    telefono,
    fecha_nacimiento,
    fecha_ingreso,
  } = req.body;

  try {
    await db.query(
      `UPDATE socios SET
         dni = $1,
         nombre = $2,
         apellido = $3,
         subcategoria = $4,
         telefono = $5,
         fecha_nacimiento = $6,
         fecha_ingreso = $7
       WHERE numero_socio = $8`,
      [dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, id]
    );

    res.json({ mensaje: 'Socio actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar socio:', err);
    res.status(500).json({ error: 'Error al actualizar socio' });
  }
});

// POST /socio/:id/foto → Subir imagen a Imgur y guardar en DB
router.post('/:id/foto', upload.single('foto'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  try {
    const response = await axios.post(
      'https://api.imgur.com/3/image',
      {
        image: req.file.buffer.toString('base64'),
        type: 'base64',
      },
      {
        headers: {
          Authorization: 'Client-ID baf7f53f74f3fab',
        },
      }
    );

    const imageUrl = response.data.data.link;

    await db.query(
      'UPDATE socios SET foto_url = $1 WHERE numero_socio = $2',
      [imageUrl, id]
    );

    res.json({ mensaje: 'Foto subida correctamente', url: imageUrl });
  } catch (err) {
    console.error('❌ Error Imgur:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Error al subir la imagen a Imgur',
      detalle: err.response?.data || err.message,
    });
  }
});

module.exports = router;



