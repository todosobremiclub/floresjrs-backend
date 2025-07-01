const express = require('express');
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

const router = express.Router();

// GET /cumpleanios
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        numero_socio,
        nombre,
        apellido,
        fecha_nacimiento,
        subcategoria AS categoria
      FROM socios
      WHERE activo = true
      ORDER BY fecha_nacimiento ASC
    `);

    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = hoy.getMonth() + 1;

    const socios = result.rows.map(s => {
      if (!s.fecha_nacimiento) return { ...s, edad: null };

      const fechaNacimiento = new Date(s.fecha_nacimiento);
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const mes = hoy.getMonth() - fechaNacimiento.getMonth();
      if (mes < 0 || (mes === 0 && hoy.getDate() < fechaNacimiento.getDate())) {
        edad--;
      }

      return {
        ...s,
        edad
      };
    });

    // ✅ Mostrar todos los socios con fecha válida (cumpleaños de todo el año)
    const sociosConFecha = socios.filter(s => s.fecha_nacimiento);
    res.json(sociosConFecha);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener cumpleanios' });
  }
});

module.exports = router;

