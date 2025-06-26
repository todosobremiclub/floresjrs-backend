const express = require('express');
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

const router = express.Router();

// GET /cumpleaños
// Retorna:
// - cumpleaños: [{ numero_socio, nombre, apellido, fecha_nacimiento }]
// - hoy: [{ numero_socio, nombre, apellido, fecha_nacimiento }]
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        numero_socio,
        nombre,
        apellido,
        fecha_nacimiento
      FROM socios
      WHERE activo = true
      ORDER BY fecha_nacimiento ASC
    `);

    const socios = result.rows;

    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = hoy.getMonth() + 1;

    const sociosHoy = socios.filter(s => {
      const fecha = new Date(s.fecha_nacimiento);
      return fecha.getDate() === diaHoy && (fecha.getMonth() + 1) === mesHoy;
    });

    res.json({ cumpleaños: socios, hoy: sociosHoy });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener cumpleaños' });
  }
});

module.exports = router;
