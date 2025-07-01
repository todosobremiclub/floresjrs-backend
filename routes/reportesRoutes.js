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

// 👉 Recaudado según la fecha real en que se pagó (sin importar el mes abonado)
router.get('/recaudado-por-fecha-pago', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        EXTRACT(YEAR FROM fecha_pago) AS anio,
        EXTRACT(MONTH FROM fecha_pago) AS mes,
        SUM(monto) AS total
      FROM pagos_mensuales
      GROUP BY EXTRACT(YEAR FROM fecha_pago), EXTRACT(MONTH FROM fecha_pago)
      ORDER BY anio, mes
    `);

    const meses = resultado.rows.map(r => ({
      mes: `${r.anio}-${String(r.mes).padStart(2, '0')}`,
      total: parseFloat(r.total)
    }));

    const totalAnual = meses.reduce((acum, r) => acum + r.total, 0);

    res.json({ meses, totalAnual });
  } catch (err) {
    console.error('❌ Error al obtener recaudado por fecha de pago:', err);
    console.error(err.stack);
    res.status(500).json({ error: 'Error al obtener reporte por fecha de pago' });
  }
});

// 📊 Socios por categoría
router.get('/socios-por-categoria', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT subcategoria AS categoria, COUNT(*) AS cantidad
      FROM socios
      WHERE activo = true
      GROUP BY subcategoria
      ORDER BY cantidad DESC
    `);

    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al obtener socios por categoría:', err);
    res.status(500).json({ error: 'Error al obtener reporte de socios por categoría' });
  }
});

module.exports = router;


