const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');
const { getMonto, setMonto } = require('../config/montoCuota');

// 👉 Obtener monto actual
router.get('/monto', verificarToken, async (req, res) => {
  try {
    const monto = await getMonto();
    res.json({ monto });
  } catch (err) {
    console.error('❌ Error al obtener monto:', err);
    res.status(500).json({ error: 'Error al obtener monto' });
  }
});


// 👉 Actualizar monto
router.post('/monto', verificarToken, async (req, res) => {
  const { monto } = req.body;
  if (typeof monto !== 'number' || monto <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  await setMonto(monto);
  res.json({ mensaje: 'Monto actualizado correctamente' });
});

// 👉 Registrar nuevo pago
router.post('/', verificarToken, async (req, res) => {
  const { socio_id, fecha_pago, monto } = req.body;

if (!socio_id || !fecha_pago) {
  return res.status(400).json({ error: 'Datos incompletos' });
}

let montoFinal = monto;
if (!montoFinal || isNaN(montoFinal)) {
  // Si no viene monto, lo tomamos de la configuración
  try {
    const resultado = await db.query(`SELECT valor FROM configuracion WHERE clave = 'monto_cuota'`);
    montoFinal = parseFloat(resultado.rows[0]?.valor || '0');
  } catch (err) {
    console.error('❌ Error al obtener monto de cuota desde configuración', err);
    return res.status(500).json({ error: 'Error al obtener monto de cuota' });
  }
}


  try {
    await db.query(
      `INSERT INTO pagos (socio_id, fecha_pago, monto, observaciones)
       VALUES ($1, $2, $3, $4)`,
      [socio_id, fecha_pago, montoFinal, 'admin']
    );
    res.status(201).json({ mensaje: 'Pago registrado correctamente' });
  } catch (err) {
    console.error('❌ Error al registrar pago:', err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

// 👉 Obtener todos los pagos (con nombre del socio)
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT 
         p.id,
         p.socio_id,
         s.nombre || ' ' || s.apellido AS nombre,
         TO_CHAR(p.fecha_pago, 'YYYY-MM-DD') AS fecha_pago,
         p.monto
       FROM pagos p
       JOIN socios s ON s.numero_socio = p.socio_id
       ORDER BY p.fecha_pago DESC`
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al obtener pagos:', err);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// 👉 Eliminar pago por ID
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await db.query('DELETE FROM pagos WHERE id = $1', [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ mensaje: 'Pago eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar pago:', err);
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
});


module.exports = router;

