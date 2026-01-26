
const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const db = require('../config/db');
const subirAFirebase = require('../utils/subirAFirebase');
const verificarToken = require('../middlewares/verificarToken');

// POST /solicitud → recibe los datos del formulario de alta
router.post('/', upload.single('foto'), async (req, res) => {
  try {
    const { nombre, apellido, dni, telefono, fechaNacimiento } = req.body;

    if (!nombre || !apellido || !dni || !telefono || !fechaNacimiento || !req.file) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
    }

    const { url } = await subirAFirebase(req.file.buffer, req.file.originalname);

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

// POST /solicitud/:id/confirmar → confirma una solicitud y crea un nuevo socio
router.post('/:id/confirmar', verificarToken, async (req, res) => {
  const { id } = req.params;

  try {
    // 1. Obtener la solicitud
    const resultSol = await db.query('SELECT * FROM solicitudes WHERE id = $1', [id]);
    if (resultSol.rows.length === 0) {
      return res.status(404).json({ error: 'Solicitud no encontrada' });
    }
    const sol = resultSol.rows[0];

    // 2. Verificar que el DNI no esté duplicado
    const dniExiste = await db.query('SELECT 1 FROM socios WHERE dni = $1', [sol.dni]);
    if (dniExiste.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe un socio con ese DNI' });
    }

    // 3. Obtener el siguiente número de socio
    const resultNum = await db.query('SELECT MAX(numero_socio) AS ultimo FROM socios');
    const ultimo = resultNum.rows[0].ultimo || 0;
    const siguiente = ultimo + 1;

    // 4. Insertar nuevo socio con categoría "A definir"
    const categoria = 'A definir';
    await db.query(`
      INSERT INTO socios (
        numero_socio, dni, nombre, apellido, subcategoria, telefono,
        fecha_nacimiento, fecha_ingreso, activo, becado, foto_url
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), true, false, $8)
    `, [
      siguiente,
      sol.dni,
      sol.nombre,
      sol.apellido,
      categoria,
      sol.telefono,
      sol.fecha_nacimiento,
      sol.foto_url
    ]);

    // 5. Eliminar la solicitud procesada
    await db.query('DELETE FROM solicitudes WHERE id = $1', [id]);

    res.json({ mensaje: 'Socio creado correctamente', numero: siguiente });
  } catch (error) {
    console.error('❌ Error al confirmar solicitud:', error);
    res.status(500).json({ error: 'Error al confirmar la solicitud' });
  }
});

module.exports = router;
