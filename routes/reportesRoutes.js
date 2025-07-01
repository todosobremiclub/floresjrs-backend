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

// 👉 Total recaudado por mes específico y acumulado anual
router.get('/recaudacion-mensual', verificarToken, async (req, res) => {
  const { anio, mes } = req.query;

  if (!anio || !mes) {
    return res.status(400).json({ error: 'Año y mes requeridos' });
  }

  try {
    // Total del mes específico
    const mensual = await db.query(
      `SELECT SUM(monto) AS total
       FROM pagos
       WHERE EXTRACT(YEAR FROM fecha_pago) = $1
         AND EXTRACT(MONTH FROM fecha_pago) = $2`,
      [anio, mes]
    );

    // Total acumulado del año
    const anual = await db.query(
      `SELECT SUM(monto) AS total
       FROM pagos
       WHERE EXTRACT(YEAR FROM fecha_pago) = $1`,
      [anio]
    );

    res.json({
      total: parseFloat(mensual.rows[0].total || 0),
      totalAnual: parseFloat(anual.rows[0].total || 0)
    });
  } catch (err) {
    console.error('❌ Error al obtener recaudación mensual:', err);
    res.status(500).json({ error: 'Error al consultar recaudación mensual' });
  }
});

module.exports = router;


