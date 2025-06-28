const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET /reportes/recaudacion-mensual?mes=2025-06
router.get('/recaudacion-mensual', verificarToken, async (req, res) => {
  const mes = req.query.mes; // formato: "2025-06"

  if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
    return res.status(400).json({ error: 'Mes inválido. Usar formato YYYY-MM' });
  }

  try {
    // 1. Obtener cuántos pagos fueron para ese mes (sin importar fecha de pago)
    const resultadoPagos = await db.query(
      `SELECT COUNT(*) AS cantidad FROM pagos_mensuales WHERE pagado_para = $1`,
      [mes]
    );
    const cantidad = parseInt(resultadoPagos.rows[0].cantidad) || 0;

    // 2. Obtener el monto configurado para ese mes
    const resultadoMonto = await db.query(
      `SELECT monto FROM monto_mensual WHERE mes = $1`,
      [mes]
    );
    const monto = resultadoMonto.rows[0]?.monto || 0;

    // 3. Total recaudado
    const total = cantidad * monto;

    res.json({ total, cantidad, monto });
  } catch (err) {
    console.error('❌ Error en /recaudacion-mensual:', err);
    res.status(500).json({ error: 'Error al calcular la recaudación' });
  }
});

module.exports = router;

