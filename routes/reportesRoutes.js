// routes/reportesRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

/*
 |------------------------------------------------------------|
 |   FLORES JUNIORS - REPORTES (VERSION INICIAL LIMPIA)       |
 |   Solo incluye: SOCIOS POR CATEGORÍA                       |
 |   Se agregarán progresivamente los demás reportes TSMC     |
 |------------------------------------------------------------|
*/


// ============================================================
// 📊 1) SOCIOS POR CATEGORÍA  (DONUT TSMC)
// ============================================================
//
// Devuelve:
// [
//   { categoria: 'Fútbol', cantidad: 40 },
//   { categoria: 'Patín',  cantidad: 22 },
//   ...
// ]
//
// Backend real de Flores: usa tabla "socios" con columna
// "subcategoria" para la categoría del socio.
// ============================================================

router.get('/socios-por-categoria', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT 
        COALESCE(subcategoria, 'Sin categoría') AS categoria,
        COUNT(*) AS cantidad
      FROM socios
      WHERE activo = true
      GROUP BY subcategoria
      ORDER BY cantidad DESC
    `);

    res.json(resultado.rows);

  } catch (err) {
    console.error('❌ Error al obtener socios por categoría:', err);
    res.status(500).json({ 
      error: 'Error al obtener reporte de socios por categoría' 
    });
  }
});



// ============================================================
// ⚠️ IMPORTANTE
// A partir de aquí iremos agregando:
//
// - cuotas impagas
// - ingresos vs gastos
// - socios nuevos por mes
// - ranking ingresos/gastos
// - ingresos por responsable
// - gastos por responsable
//
// Todo con estilo TSMC adaptado a Flores.
// ============================================================


module.exports = router;
