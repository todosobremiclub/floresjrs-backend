const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// 1. Socios al día vs en mora
router.get('/estado-pago', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE s.id IN (
            SELECT p.id_socio FROM pagos p
            WHERE p.fecha >= NOW() - INTERVAL '31 days'
          )
        ) AS al_dia,
        COUNT(*) FILTER (
          WHERE s.id NOT IN (
            SELECT p.id_socio FROM pagos p
            WHERE p.fecha >= NOW() - INTERVAL '31 days'
          )
        ) AS en_mora
      FROM socios s
    `);

    res.json(resultado.rows[0]);
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
        COUNT(*) FILTER (WHERE ult_pago.fecha >= NOW() - INTERVAL '31 days') AS al_dia,
        COUNT(*) FILTER (WHERE ult_pago.fecha < NOW() - INTERVAL '31 days' OR ult_pago.fecha IS NULL) AS en_mora
      FROM socios s
      LEFT JOIN LATERAL (
        SELECT p.fecha
        FROM pagos p
        WHERE p.id_socio = s.id
        ORDER BY p.fecha DESC
        LIMIT 1
      ) ult_pago ON true
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
