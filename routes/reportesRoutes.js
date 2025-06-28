const express = require('express');
const router = express.Router();
const db = require('../config/db');

// GET /reportes/recaudacion-mensual?anio=2025&mes=6
router.get('/recaudacion-mensual', async (req, res) => {
  const { anio, mes } = req.query;

  if (!anio || !mes) {
    return res.status(400).json({ error: 'Año y mes son requeridos' });
  }

  try {
    const resultado = await db.query(
      `SELECT COALESCE(SUM(monto), 0) AS total
       FROM pagos
       WHERE EXTRACT(YEAR FROM fecha_pago) = $1
       AND EXTRACT(MONTH FROM fecha_pago) = $2`,
      [anio, mes]
    );

    res.json({ total: resultado.rows[0].total });
  } catch (err) {
    console.error('❌ Error en /recaudacion-mensual:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;

