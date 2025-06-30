const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET todos los montos
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM montos_mensuales ORDER BY anio DESC, mes ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener los montos mensuales' });
  }
});

// POST crear o actualizar monto
router.post('/', verificarToken, async (req, res) => {
  const { mes, anio, monto } = req.body;
  if (!mes || !anio || !monto) return res.status(400).json({ error: 'Datos incompletos' });

  try {
    await db.query(`
      INSERT INTO montos_mensuales (mes, anio, monto)
      VALUES ($1, $2, $3)
      ON CONFLICT (mes, anio) DO UPDATE SET monto = $3
    `, [mes, anio, monto]);
    res.json({ mensaje: 'Monto actualizado correctamente' });
  } catch (err) {
    res.status(500).json({ error: 'Error al guardar el monto' });
  }
});

module.exports = router;
