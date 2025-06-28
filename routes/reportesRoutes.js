const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET /reportes/recaudacion-mensual?mes=YYYY-MM
router.get('/recaudacion-mensual', verificarToken, async (req, res) => {
  const mesParam = req.query.mes;

  if (!mesParam || !/^\d{4}-\d{2}$/.test(mesParam)) {
    return res.status(400).json({ error: 'Mes inválido. Usar formato YYYY-MM' });
  }

  const [anio, mes] = mesParam.split('-').map(Number);

  try {
    const resultado = await db.query(`
      SELECT COUNT(*) AS cantidad
      FROM pagos_mensuales
      WHERE mes_pagado = $1
    `, [mesParam]);

    const resultadoMonto = await db.query(`SELECT monto FROM monto LIMIT 1`);
    const montoCuota = resultadoMonto.rows[0]?.monto ?? 0;

    const cantidad = parseInt(resultado.rows[0].cantidad) || 0;
    const total = cantidad * montoCuota;

    res.json({ total });
  } catch (err) {
    console.error('❌ Error en /recaudacion-mensual:', err);
    res.status(500).json({ error: 'Error al calcular la recaudación' });
  }
});

module.exports = router;

