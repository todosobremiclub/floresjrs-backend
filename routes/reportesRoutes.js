const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// 1. Socios al día vs en mora
router.get('/estado-pago', verificarToken, async (req, res) => {
  try {
    const becados = await db.query(`SELECT COUNT(*) FROM socios WHERE becado = true`);
    const total = await db.query(`SELECT COUNT(*) FROM socios WHERE becado = false`);
    const pagos = await db.query(`
      SELECT COUNT(DISTINCT numero_socio) AS cantidad
      FROM pagos
      WHERE fecha >= CURRENT_DATE - INTERVAL '31 days'
    `);

    const alDia = parseInt(becados.rows[0].count) + parseInt(pagos.rows[0].cantidad);
    const enMora = parseInt(total.rows[0].count) - parseInt(pagos.rows[0].cantidad);

    res.json({ alDia, enMora });
  } catch (err) {
    console.error('❌ Error en /estado-pago:', err);
    res.status(500).json({ error: 'Error al calcular estado de pago' });
  }
});


// 2. Cantidad de socios por categoría
router.get('/por-categoria', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT subcategoria AS categoria, COUNT(*) FROM socios GROUP BY subcategoria
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// 3. Estado de pago por categoría
router.get('/estado-pago-por-categoria', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT s.subcategoria AS categoria,
        COUNT(DISTINCT CASE
          WHEN p.fecha >= CURRENT_DATE - INTERVAL '31 days' THEN s.numero_socio
        END) AS al_dia,
        COUNT(DISTINCT CASE
          WHEN (p.fecha < CURRENT_DATE - INTERVAL '31 days' OR p.fecha IS NULL) THEN s.numero_socio
        END) AS en_mora
      FROM socios s
      LEFT JOIN (
        SELECT numero_socio, MAX(fecha) AS fecha
        FROM pagos
        GROUP BY numero_socio
      ) p ON s.numero_socio = p.numero_socio
      WHERE s.becado = false
      GROUP BY s.subcategoria
    `);
    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error en /estado-pago-por-categoria:', err);
    res.status(500).json({ error: 'Error al calcular estado por categoría' });
  }
});


// 4. Foto cargada
router.get('/con-foto', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE foto_url IS NOT NULL AND foto_url != '') AS con_foto,
        COUNT(*) FILTER (WHERE foto_url IS NULL OR foto_url = '') AS sin_foto
      FROM socios
    `);
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener datos de fotos' });
  }
});

// 5. Activos e inactivos
router.get('/activos', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        COUNT(*) FILTER (WHERE activo = true) AS activos,
        COUNT(*) FILTER (WHERE activo = false) AS inactivos
      FROM socios
    `);
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener activos/inactivos' });
  }
});

module.exports = router;
