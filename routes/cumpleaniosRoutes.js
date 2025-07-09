const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

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
        AND EXTRACT(DAY FROM fecha_nacimiento) = EXTRACT(DAY FROM CURRENT_DATE)
        AND EXTRACT(MONTH FROM fecha_nacimiento) = EXTRACT(MONTH FROM CURRENT_DATE)
    `);

    const hoy = new Date();
    const cumpleanierosHoy = result.rows.map(s => {
      const fechaNacimiento = new Date(s.fecha_nacimiento);
      let edad = hoy.getFullYear() - fechaNacimiento.getFullYear();
      const m = hoy.getMonth() - fechaNacimiento.getMonth();
      if (m < 0 || (m === 0 && hoy.getDate() < fechaNacimiento.getDate())) edad--;

      return { ...s, edad };
    });

    res.json({ cumpleanios: cumpleanierosHoy });
  } catch (error) {
    console.error('❌ Error al obtener cumpleañeros de hoy:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
