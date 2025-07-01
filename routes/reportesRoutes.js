// routes/reportesRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// ✅ Recaudado por mes pagado (de pagos_mensuales)
router.get('/recaudado-por-fecha', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT anio, mes, SUM(monto) AS total
      FROM pagos_mensuales
      GROUP BY anio, mes
      ORDER BY anio, mes
    `);

    const datos = resultado.rows.map(r => ({
      mes: `${r.anio}-${String(r.mes).padStart(2, '0')}`,
      total: parseInt(r.total)
    }));

    const anioActual = new Date().getFullYear();
    const totalAnual = datos
      .filter(d => d.mes.startsWith(`${anioActual}-`))
      .reduce((acum, d) => acum + d.total, 0);

    res.json({ meses: datos, totalAnual });
  } catch (err) {
    console.error('❌ Error al obtener recaudado por mes:', err);
    res.status(500).json({ error: 'Error al obtener reporte de recaudación mensual' });
  }
});

module.exports = router;

