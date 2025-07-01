// routes/reportesRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// 👉 Recaudado por fecha real de pago (tabla pagos)
router.get('/recaudado-por-fecha', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        EXTRACT(YEAR FROM fecha_pago) AS anio,
        EXTRACT(MONTH FROM fecha_pago) AS mes,
        SUM(monto) AS total
      FROM pagos
      GROUP BY anio, mes
      ORDER BY anio, mes
    `);

    const meses = resultado.rows.map(r => ({
      mes: `${r.anio}-${String(r.mes).padStart(2, '0')}`,
      total: parseFloat(r.total)
    }));

    const totalAnual = meses.reduce((acum, r) => acum + r.total, 0);

    res.json({ meses, totalAnual });
  } catch (err) {
    console.error('❌ Error al obtener recaudado por fecha:', err);
    res.status(500).json({ error: 'Error al obtener datos de reportes por fecha' });
  }
});

// 👉 Recaudado por mes pagado (tabla pagos_mensuales)
router.get('/recaudado-por-mes-pagado', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        anio,
        mes,
        SUM(monto) AS total
      FROM pagos_mensuales
      GROUP BY anio, mes
      ORDER BY anio, mes
    `);

    const meses = resultado.rows.map(r => ({
      mes: `${r.anio}-${String(r.mes).padStart(2, '0')}`,
      total: parseFloat(r.total)
    }));

    const totalAnual = meses.reduce((acum, r) => acum + r.total, 0);

    res.json({ meses, totalAnual });
  } catch (err) {
    console.error('❌ Error al obtener recaudado por mes pagado:', err);
    res.status(500).json({ error: 'Error al obtener datos de reportes por mes pagado' });
  }
});

module.exports = router;

