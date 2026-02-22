const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// Helper: "YYYY-MM" -> { anio, mes }
function parsePeriodo(periodo) {
  if (!periodo || typeof periodo !== 'string') return null;
  const match = periodo.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const anio = parseInt(match[1], 10);
  const mes = parseInt(match[2], 10);
  if (anio < 2000 || anio > 2100 || mes < 1 || mes > 12) return null;
  return { anio, mes };
}

function periodoStr(anio, mes) {
  return `${anio}-${String(mes).padStart(2, '0')}`;
}

/**
 * GET /gastos?desde=YYYY-MM&hasta=YYYY-MM
 * Devuelve gastos con nombre de tipo y responsable
 */
router.get('/', verificarToken, async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    let where = '';
    const params = [];
    let idx = 1;

    const pDesde = desde ? parsePeriodo(desde) : null;
    const pHasta = hasta ? parsePeriodo(hasta) : null;

    if (desde && !pDesde) return res.status(400).json({ error: 'Parámetro "desde" inválido. Use YYYY-MM.' });
    if (hasta && !pHasta) return res.status(400).json({ error: 'Parámetro "hasta" inválido. Use YYYY-MM.' });

    // Comparación por (anio*100 + mes) para rangos
    if (pDesde) {
      where += `${where ? ' AND ' : 'WHERE '} (g.anio * 100 + g.mes) >= $${idx++}`;
      params.push(pDesde.anio * 100 + pDesde.mes);
    }
    if (pHasta) {
      where += `${where ? ' AND ' : 'WHERE '} (g.anio * 100 + g.mes) <= $${idx++}`;
      params.push(pHasta.anio * 100 + pHasta.mes);
    }

    const query = `
      SELECT
        g.id,
        g.anio,
        g.mes,
        g.tipo_id,
        tg.nombre AS tipo_nombre,
        g.responsable_id,
        rg.nombre AS responsable_nombre,
        g.monto,
        TO_CHAR(g.fecha_creacion, 'YYYY-MM-DD HH24:MI') AS fecha_creacion,
        g.observaciones
      FROM gastos g
      JOIN tipos_gasto tg ON tg.id = g.tipo_id
      JOIN responsables_gasto rg ON rg.id = g.responsable_id
      ${where}
      ORDER BY g.anio DESC, g.mes DESC, g.id DESC
    `;

    const result = await db.query(query, params);

    const salida = result.rows.map(r => ({
      ...r,
      periodo: periodoStr(r.anio, r.mes)
    }));

    res.json(salida);
  } catch (err) {
    console.error('❌ Error al obtener gastos:', err);
    res.status(500).json({ error: 'Error al obtener gastos' });
  }
});

/**
 * POST /gastos
 * body: { tipo_id, responsable_id, periodo:"YYYY-MM", monto, observaciones? }
 */
router.post('/', verificarToken, async (req, res) => {
  try {
    const { tipo_id, responsable_id, periodo, monto, observaciones } = req.body;

    if (tipo_id == null || responsable_id == null || periodo == null || monto == null) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const p = parsePeriodo(periodo);
    if (!p) return res.status(400).json({ error: 'Periodo inválido. Use YYYY-MM.' });

    const montoNum = Number(monto);
    if (Number.isNaN(montoNum) || montoNum < 0) {
      return res.status(400).json({ error: 'Monto inválido' });
    }

    // Validar que existan tipo y responsable (opcional pero recomendable)
    const tipoOk = await db.query('SELECT id FROM tipos_gasto WHERE id = $1 AND activo = TRUE', [tipo_id]);
    if (tipoOk.rowCount === 0) return res.status(400).json({ error: 'Tipo de gasto inexistente o inactivo' });

    const respOk = await db.query('SELECT id FROM responsables_gasto WHERE id = $1 AND activo = TRUE', [responsable_id]);
    if (respOk.rowCount === 0) return res.status(400).json({ error: 'Responsable inexistente o inactivo' });

    const insert = await db.query(
      `INSERT INTO gastos (anio, mes, tipo_id, responsable_id, monto, observaciones)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, anio, mes, tipo_id, responsable_id, monto, fecha_creacion, observaciones`,
      [p.anio, p.mes, tipo_id, responsable_id, montoNum, observaciones ?? null]
    );

    res.status(201).json({
      mensaje: 'Gasto registrado correctamente',
      gasto: {
        ...insert.rows[0],
        periodo: periodoStr(insert.rows[0].anio, insert.rows[0].mes)
      }
    });
  } catch (err) {
    console.error('❌ Error al guardar gasto:', err);
    res.status(500).json({ error: 'Error al guardar gasto' });
  }
});

/**
 * DELETE /gastos/:id
 */
router.delete('/:id', verificarToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'ID inválido' });

    const result = await db.query('DELETE FROM gastos WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Gasto no encontrado' });

    res.json({ mensaje: 'Gasto eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar gasto:', err);
    res.status(500).json({ error: 'Error al eliminar gasto' });
  }
});

module.exports = router;