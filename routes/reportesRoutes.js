const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET /reportes/recaudacion-mensual?mes=3
router.get('/recaudacion-mensual', verificarToken, async (req, res) => {
  const mes = parseInt(req.query.mes);
  const anioActual = new Date().getFullYear();

  if (!mes || mes < 1 || mes > 12) {
    return res.status(400).json({ error: 'Mes inválido' });
  }

  try {
    const resultado = await db.query(`
  SELECT SUM(monto) AS total
  FROM pagos
  WHERE EXTRACT(MONTH FROM fecha_pago) = $1 AND EXTRACT(YEAR FROM fecha_pago) = EXTRACT(YEAR FROM CURRENT_DATE)
`, [mes]);
;

    const total = resultado.rows[0].total || 0;
    res.json({ total });
  } catch (err) {
    console.error('❌ Error en /recaudacion-mensual:', err);
    res.status(500).json({ error: 'Error al calcular la recaudación' });
  }
});

module.exports = router;
