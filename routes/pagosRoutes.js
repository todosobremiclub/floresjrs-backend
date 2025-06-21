const express = require('express');
const router = express.Router();
const verificarToken = require('../middlewares/verificarToken');
const { getMonto, setMonto } = require('../config/montoCuota');

// GET monto actual
router.get('/monto', verificarToken, (req, res) => {
  res.json({ monto: getMonto() });
});

// POST actualizar monto
router.post('/monto', verificarToken, (req, res) => {
  const { monto } = req.body;
  if (typeof monto !== 'number' || monto <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  setMonto(monto);
  res.json({ mensaje: 'Monto actualizado correctamente' });
});

module.exports = router;
