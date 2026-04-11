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
 |     3) Socios nuevos por mes                               |
 |     4) Ingresos vs Gastos (mensual + anual)                |
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
// Lógica: usando pagos_mensuales + socios
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


// ============================================================
// 👤 3) SOCIOS NUEVOS POR MES (según fecha_ingreso)
// GET /reportes/socios-nuevos-por-mes
// ============================================================
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
// 💰 4) INGRESOS VS GASTOS — RESUMEN MENSUAL (ÚLTIMOS 6 MESES)
// GET /reportes/ingresos-vs-gastos-mensual
//
// ✅ Ajustado a tu BBDD:
// - pagos: fecha_pago (date), monto (numeric)
// - gastos: anio (int), mes (int), monto (numeric)
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
          SUM(monto)::numeric AS total_ingresos
        FROM pagos
        GROUP BY 1
      ),
      gastos_norm AS (
        SELECT
          make_date(anio, mes, 1)::date AS mes,
          SUM(monto)::numeric AS total_gastos
        FROM gastos
        GROUP BY 1
      )
      SELECT
        to_char(m.mes, 'YYYY-MM') AS mes,
        COALESCE(i.total_ingresos, 0) AS ingresos,
        COALESCE(g.total_gastos, 0) AS gastos
      FROM meses m
      LEFT JOIN ingresos i ON i.mes = m.mes
      LEFT JOIN gastos_norm g ON g.mes = m.mes
      ORDER BY m.mes;
    `;

    const { rows } = await db.query(q);
    res.json(rows);

  } catch (err) {
    console.error('❌ Error ingresos vs gastos mensual:', err);
    res.status(500).json({ error: 'Error al obtener ingresos vs gastos mensual' });
  }
});


// ============================================================
// 💰 4b) INGRESOS VS GASTOS — POR AÑO (12 meses) + TOTALES
// GET /reportes/ingresos-vs-gastos-anio?anio=2026
//
// ✅ Ajustado a tu BBDD:
// - pagos: fecha_pago, monto
// - gastos: anio, mes, monto
// ============================================================
router.get('/ingresos-vs-gastos-anio', verificarToken, async (req, res) => {
  try {
    const anio = parseInt(req.query.anio || new Date().getFullYear(), 10);

    const q = `
      WITH meses AS (
        SELECT generate_series(1, 12) AS mes_num
      ),
      ingresos AS (
  SELECT
    mes_num,
    SUM(ingresos)::numeric AS ingresos
  FROM (
    -- Pagos manuales
    SELECT
      EXTRACT(MONTH FROM fecha_pago)::int AS mes_num,
      monto AS ingresos
    FROM pagos
    WHERE EXTRACT(YEAR FROM fecha_pago)::int = $1

    UNION ALL

    -- Cuotas mensuales
    SELECT
      mes::int AS mes_num,
      monto AS ingresos
    FROM pagos_mensuales
    WHERE anio = $1
  ) t
  GROUP BY mes_num
),
      gastos_norm AS (
        SELECT
          mes::int AS mes_num,
          SUM(monto)::numeric AS gastos
        FROM gastos
        WHERE anio = $1
        GROUP BY 1
      ),
      base AS (
        SELECT
          $1::int AS anio,
          m.mes_num,
          COALESCE(i.ingresos, 0) AS ingresos,
          COALESCE(g.gastos, 0)   AS gastos
        FROM meses m
        LEFT JOIN ingresos i   ON i.mes_num = m.mes_num
        LEFT JOIN gastos_norm g ON g.mes_num = m.mes_num
        ORDER BY m.mes_num
      )
      SELECT
        json_build_object(
          'anio', $1::int,
          'meses', json_agg(
            json_build_object(
              'mes', to_char(make_date($1::int, base.mes_num, 1), 'YYYY-MM'),
              'ingresos', base.ingresos,
              'gastos', base.gastos
            )
            ORDER BY base.mes_num
          ),
          'totales', json_build_object(
            'ingresos', SUM(base.ingresos),
            'gastos', SUM(base.gastos),
            'resultado', SUM(base.ingresos) - SUM(base.gastos)
          )
        ) AS data
      FROM base;
    `;

    const { rows } = await db.query(q, [anio]);
    res.json(rows[0]?.data || { anio, meses: [], totales: { ingresos: 0, gastos: 0, resultado: 0 } });

  } catch (err) {
    console.error('❌ Error ingresos vs gastos año:', err);
    res.status(500).json({ error: 'Error al obtener Ingresos vs Gastos por año' });
  }
});

// ============================================================
// 📊 5) INGRESOS Y GASTOS POR TIPO (MENSUAL)
// GET /reportes/ingresos-gastos-por-tipo?mes=YYYY-MM
// Devuelve: { mes, ingresos:[{tipo,monto}], gastos:[{tipo,monto}] }
// ============================================================
router.get('/ingresos-gastos-por-tipo', verificarToken, async (req, res) => {
  try {
    const mes = req.query.mes; // YYYY-MM
    if (!mes || !/^\d{4}-\d{2}$/.test(mes)) {
      return res.status(400).json({ error: 'Mes inválido (YYYY-MM)' });
    }

    const q = `
      WITH mes_sel AS (
        SELECT to_date($1 || '-01', 'YYYY-MM-DD')::date AS mes
      ),

      -- Ingresos por cuotas (pagos_mensuales)
      ingresos_cuotas AS (
        SELECT
          'Cuotas'::text AS tipo,
          COALESCE(SUM(pm.monto), 0)::numeric AS monto
        FROM pagos_mensuales pm
        JOIN mes_sel m ON make_date(pm.anio, pm.mes, 1) = m.mes
      ),

      -- Otros ingresos (pagos con tipo_ingreso_id)
      ingresos_otros AS (
        SELECT
          COALESCE(ti.nombre, 'Sin tipo') AS tipo,
          COALESCE(SUM(p.monto), 0)::numeric AS monto
        FROM pagos p
        LEFT JOIN tipos_ingreso ti ON ti.id = p.tipo_ingreso_id
        JOIN mes_sel m ON date_trunc('month', p.fecha_pago) = m.mes
        GROUP BY 1
      ),

      ingresos AS (
        SELECT * FROM ingresos_cuotas
        UNION ALL
        SELECT * FROM ingresos_otros
      ),

      -- Gastos por tipo
      gastos AS (
        SELECT
          COALESCE(tg.nombre, 'Sin tipo') AS tipo,
          COALESCE(SUM(g.monto), 0)::numeric AS monto
        FROM gastos g
        LEFT JOIN tipos_gasto tg ON tg.id = g.tipo_gasto_id
        JOIN mes_sel m ON make_date(g.anio, g.mes, 1) = m.mes
        GROUP BY 1
      )

      SELECT
        $1::text AS mes,
        COALESCE(
          (SELECT json_agg(json_build_object('tipo', tipo, 'monto', monto) ORDER BY monto DESC)
           FROM ingresos
           WHERE monto <> 0),
          '[]'::json
        ) AS ingresos,
        COALESCE(
          (SELECT json_agg(json_build_object('tipo', tipo, 'monto', monto) ORDER BY monto DESC)
           FROM gastos
           WHERE monto <> 0),
          '[]'::json
        ) AS gastos;
    `;

    const { rows } = await db.query(q, [mes]);
    res.json(rows[0] || { mes, ingresos: [], gastos: [] });

  } catch (err) {
    console.error('❌ Error ingresos-gastos-por-tipo:', err);
    res.status(500).json({ error: 'Error al obtener ingresos/gastos por tipo' });
  }
});


// ============================================================
// 🔚 EXPORT
// ============================================================
module.exports = router;
