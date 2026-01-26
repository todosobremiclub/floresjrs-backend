
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const db = require('../config/db');
const subirAFirebase = require('../utils/subirAFirebase');
const verificarToken = require('../middlewares/verificarToken'); // Asegúrate de tener este middleware

// POST /solicitud → recibe los datos del formulario de alta
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const { nombre, apellido, dni, telefono, fechaNacimiento } = req.body;

    if (!nombre || !apellido || !dni || !telefono || !fechaNacimiento || !req.file) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    // Subir la imagen a Firebase
    const { url } = await subirAFirebase(req.file.buffer, req.file.originalname);

    // Insertar en la tabla solicitudes
    const query = `
      INSERT INTO solicitudes (nombre, apellido, dni, telefono, fecha_nacimiento, foto_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const values = [nombre, apellido, dni, telefono, fechaNacimiento, url];
    const result = await db.query(query, values);

    res.status(201).json({ mensaje: 'Solicitud registrada', id: result.rows[0].id });
  } catch (error) {
    console.error('❌ Error al guardar solicitud:', error);
    res.status(500).json({ error: 'Error al guardar la solicitud' });
  }
});

// GET /solicitud → devuelve todas las solicitudes pendientes (protegido)
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM solicitudes ORDER BY fecha_solicitud DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al obtener solicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
});

// DELETE /solicitud/:id → elimina una solicitud pendiente (protegido)
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await db.query('DELETE FROM solicitudes WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    res.json({ mensaje: 'Solicitud eliminada correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar solicitud:', error);
    res.status(500).json({ error: 'Error al eliminar la solicitud' });
  }
});

module.exports = router;

