const express = require('express');
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

const router = express.Router();

// GET /cumpleanios → todos los socios con cumpleaños válidos
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        numero_socio,
        nombre,
        apellido,
        fecha_nacimiento,
        subcategoria AS categoria,
        foto_url
      FROM socios
      WHERE activo = true
      ORDER BY fecha_nacimiento ASC
    `);

    const hoy = new Date();
    const socios = result.rows.map(s => {
      if (!s.fecha_nacimiento) return { ...s, edad: null };

      const fechaNacimiento = new Date(s.fecha_nacimiento + 'T00:00:00-03:00'); // fuerza zona horaria
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

    const sociosConFecha = socios.filter(s => s.fecha_nacimiento);
    res.json(sociosConFecha);

  } catch (error) {
    console.error('❌ Error al obtener cumpleañeros:', error);
    res.status(500).json({ error: 'Error al obtener cumpleanios' });
  }
});

// GET /cumpleanios/hoy → solo los socios que cumplen hoy
router.get('/hoy', verificarToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        numero_socio,
        nombre,
        apellido,
        fecha_nacimiento,
        subcategoria AS categoria,
        foto_url
      FROM socios
      WHERE activo = true
    `);

    const hoy = new Date();
    const diaHoy = hoy.getDate();
    const mesHoy = hoy.getMonth() + 1;

    const cumpleanierosHoy = result.rows.filter(s => {
      if (!s.fecha_nacimiento) return false;

      const fecha = new Date(s.fecha_nacimiento + 'T00:00:00-03:00'); // ✅ aplica GMT-3
      return fecha.getDate() === diaHoy && (fecha.getMonth() + 1) === mesHoy;
    }).map(s => {
      const fechaNacimiento = new Date(s.fecha_nacimiento + 'T00:00:00-03:00');
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const m = hoy.getMonth() - fechaNacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;

      return {
        ...s,
        edad
      };
    });

    res.json({ cumpleanios: cumpleanierosHoy });
  } catch (error) {
    console.error('❌ Error al obtener cumpleañeros de hoy:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
