const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET /reportes/recaudacion-mensual?mes=YYYY-MM
router.get('/recaudacion-mensual', verificarToken, async (req, res) => {
  const mes = req.query.mes; // en formato YYYY-MM

  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return res.status(400).json({ error: 'Mes inválido. Usar formato YYYY-MM' });
  }

  try {
    // Obtenemos el monto actual de la cuota
    const configRes = await db.query('SELECT monto FROM configuracion LIMIT 1');
    const monto = configRes.rows[0]?.monto || 0;

    // Contamos los pagos registrados para ese mes
    const pagosRes = await db.query(`
      SELECT COUNT(*) AS cantidad
      FROM pagos_mensuales
      WHERE mes = $1
    `, [mes]);

    const cantidad = parseInt(pagosRes.rows[0].cantidad) || 0;
    const total = cantidad * monto;

    res.json({ total });
  } catch (err) {
    console.error('❌ Error en /recaudacion-mensual:', err);
    res.status(500).json({ error: 'Error al calcular la recaudación' });
  }
});

module.exports = router;

