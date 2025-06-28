const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');

// GET /reportes/recaudacion-mensual?anio=2025&mes=6
router.get('/recaudacion-mensual', verificarToken, async (req, res) => {
  const { anio, mes } = req.query;

  const anioInt = parseInt(anio);
  const mesInt = parseInt(mes);

  if (!anioInt || !mesInt || mesInt < 1 || mesInt > 12) {
    return res.status(400).json({ error: 'Mes o año inválido. Usar formato ?anio=YYYY&mes=MM' });
  }

  try {
    const resultado = await db.query(`
      SELECT SUM(monto) AS total
      FROM pagos
      WHERE EXTRACT(YEAR FROM fecha_pago) = $1
      AND EXTRACT(MONTH FROM fecha_pago) = $2
    `, [anioInt, mesInt]);

    const total = resultado.rows[0].total || 0;
    res.json({ total });
  } catch (err) {
    console.error('❌ Error en /recaudacion-mensual:', err);
    res.status(500).json({ error: 'Error al calcular la recaudación' });
  }
});

module.exports = router;
