// routes/reportesRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

/*
 |------------------------------------------------------------|
 |   FLORES JUNIORS - REPORTES (VERSION ORDENADA)             |
 |   Incluye:                                                 |
 |     1) Socios por Categoría                                |
 |     2) Cuotas Impagas (resumen + detalle)                  |
 |------------------------------------------------------------|
*/


// ============================================================
// 📊 1) SOCIOS POR CATEGORÍA
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
// 📌 2) CUOTAS IMPAGAS — RESUMEN POR MES
// ============================================================
//
// Devuelve:
// [
//   { mes: "2026-03", sin_pago: 13 },
//   { mes: "2026-02", sin_pago: 3 },
//   ...
// ]
//
// Lógica: igual a TSMC pero usando pagos_mensuales + socios de FLORES
// ============================================================

router.get('/cuotas-impagas-resumen', verificarToken, async (req, res) => {
  try {

    const q = `
      WITH socios_activos AS (
        SELECT 
          numero_socio,
          fecha_ingreso::date
        FROM socios
        WHERE activo = true
          AND becado = false
          AND fecha_ingreso IS NOT NULL
      ),

      limites AS (
        SELECT
          date_trunc('month', MIN(fecha_ingreso))::date AS min_mes,
          date_trunc('month', NOW())::date AS max_mes
        FROM socios_activos
      ),

      serie_meses AS (
        SELECT generate_series(
          (SELECT min_mes FROM limites),
          (SELECT max_mes FROM limites),
          interval '1 month'
        )::date AS mes
      ),

      cuotas AS (
        SELECT 
          s.numero_socio,
          m.mes
        FROM socios_activos s
        JOIN serie_meses m
          ON m.mes >= date_trunc('month', s.fecha_ingreso)
      ),

      pagos_norm AS (
        SELECT 
          socio_numero,
          make_date(anio, mes, 1) AS mes
        FROM pagos_mensuales
      ),

      cuotas_con_pagos AS (
        SELECT
          c.mes,
          c.numero_socio,
          EXISTS (
            SELECT 1
            FROM pagos_norm p
            WHERE p.socio_numero = c.numero_socio
              AND p.mes = c.mes
          ) AS pagado
        FROM cuotas c
      )

      SELECT
        to_char(mes, 'YYYY-MM') AS mes,
        COUNT(*) FILTER (WHERE NOT pagado) AS sin_pago
      FROM cuotas_con_pagos
      GROUP BY mes
      HAVING COUNT(*) FILTER (WHERE NOT pagado) > 0
      ORDER BY mes DESC;
    `;

    const { rows } = await db.query(q);
    res.json(rows);

  } catch (err) {
    console.error("❌ Error cuotas impagas resumen:", err);
    res.status(500).json({ error: "Error al obtener cuotas impagas" });
  }
});

// ============================================================
// 📌 2b) CUOTAS IMPAGAS — DETALLE POR MES
// GET /reportes/cuotas-impagas-detalle?mes=YYYY-MM
// Devuelve listado de socios activos (no becados) SIN pago en ese mes
// ============================================================
router.get('/cuotas-impagas-detalle', verificarToken, async (req, res) => {
  try {
    const { mes } = req.query; // "YYYY-MM"

    if (!mes || typeof mes !== 'string' || !/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ error: 'Parámetro mes inválido. Use formato YYYY-MM' });
    }

    const q = `
      WITH mes_sel AS (
        SELECT to_date($1 || '-01', 'YYYY-MM-DD')::date AS mes
      ),
      socios_activos AS (
        SELECT
          numero_socio,
          dni,
          apellido,
          nombre,
          COALESCE(subcategoria, 'Sin categoría') AS categoria,
          telefono,
          fecha_ingreso::date AS fecha_ingreso
        FROM socios
        WHERE activo = true
          AND becado = false
          AND fecha_ingreso IS NOT NULL
      )
      SELECT
        s.numero_socio AS "N° Socio",
        s.dni          AS "DNI",
        s.apellido     AS "Apellido",
        s.nombre       AS "Nombre",
        s.categoria    AS "Categoría",
        s.telefono     AS "Teléfono",
        to_char(s.fecha_ingreso, 'YYYY-MM-DD') AS "Fecha ingreso"
      FROM socios_activos s
      CROSS JOIN mes_sel m
      WHERE date_trunc('month', s.fecha_ingreso) <= m.mes
        AND NOT EXISTS (
          SELECT 1
          FROM pagos_mensuales p
          WHERE p.socio_numero = s.numero_socio
            AND make_date(p.anio, p.mes, 1) = m.mes
        )
      ORDER BY s.apellido, s.nombre;
    `;

    const { rows } = await db.query(q, [mes]);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error cuotas impagas detalle:', err);
    res.status(500).json({ error: 'Error al obtener detalle de cuotas impagas' });
  }
});



// 3) Socios nuevos por mes (según fecha_ingreso)
router.get('/socios-nuevos-por-mes', verificarToken, async (req, res) => {
  try {
    const q = `
      SELECT
        TO_CHAR(fecha_ingreso, 'YYYY-MM') AS mes,
        COUNT(*) AS cantidad
      FROM socios
      WHERE fecha_ingreso IS NOT NULL
        AND activo = true
      GROUP BY 1
      ORDER BY 1;
    `;

    const { rows } = await db.query(q);
    res.json(rows);

  } catch (err) {
    console.error('❌ Error en /socios-nuevos-por-mes:', err);
    res.status(500).json({ error: 'Error al obtener socios nuevos por mes' });
  }
});

// ============================================================
// 💰 INGRESOS VS GASTOS — RESUMEN MENSUAL
// GET /reportes/ingresos-vs-gastos-mensual
// ============================================================
router.get('/ingresos-vs-gastos-mensual', verificarToken, async (req, res) => {
  try {
    const q = `
      WITH meses AS (
        SELECT generate_series(
          date_trunc('month', now()) - interval '5 months',
          date_trunc('month', now()),
          interval '1 month'
        )::date AS mes
      ),
      ingresos AS (
        SELECT
          date_trunc('month', fecha_pago)::date AS mes,
          SUM(monto) AS total_ingresos
        FROM pagos
        GROUP BY 1
      ),
      gastos AS (
        SELECT
          date_trunc('month', fecha)::date AS mes,
          SUM(monto) AS total_gastos
        FROM gastos
        GROUP BY 1
      )
      SELECT
        to_char(m.mes, 'YYYY-MM') AS mes,
        COALESCE(i.total_ingresos, 0) AS ingresos,
        COALESCE(g.total_gastos, 0) AS gastos
      FROM meses m
      LEFT JOIN ingresos i ON i.mes = m.mes
      LEFT JOIN gastos g ON g.mes = m.mes
      ORDER BY m.mes;
    `;

    const { rows } = await db.query(q);
    res.json(rows);
  } catch (err) {
    console.error('❌ Error ingresos vs gastos mensual:', err);
    res.status(500).json({ error: 'Error al obtener ingresos vs gastos' });
  }
});

// ============================================================
// 🔚 EXPORT
// ============================================================
module.exports = router;