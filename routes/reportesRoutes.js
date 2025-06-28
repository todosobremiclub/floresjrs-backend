const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET /reportes/recaudacion-mensual?mes=2025-05
router.get('/recaudacion-mensual', verificarToken, async (req, res) => {
  const mesParam = req.query.mes;

  if (!mesParam || !/^\d{4}-\d{2}$/.test(mesParam)) {
    return res.status(400).json({ error: 'Mes inválido. Usar formato YYYY-MM' });
  }

  try {
    const resultado = await db.query(`
      SELECT COUNT(*) AS cantidad
      FROM pagos_mensuales
      WHERE mes = $1
    `, [mesParam]);

    const cantidad = parseInt(resultado.rows[0].cantidad, 10) || 0;

    // Obtener el monto actual de la cuota
    const montoRes = await db.query('SELECT monto FROM monto_cuota ORDER BY id DESC LIMIT 1');
    const monto = parseInt(montoRes.rows[0]?.monto || 0, 10);

    const total = cantidad * monto;

    res.json({ total });
  } catch (err) {
    console.error('❌ Error en /recaudacion-mensual:', err);
    res.status(500).json({ error: 'Error al calcular la recaudación' });
  }
});

module.exports = router;

