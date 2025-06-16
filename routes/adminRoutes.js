const express = require('express');
const router = express.Router();
const db = require('../config/db');

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const resultado = await db.query(
      'SELECT * FROM admins WHERE usuario = $1 AND contraseña = $2',
      [usuario, password]
    );

    if (resultado.rows.length > 0) {
      // Login exitoso
      res.json({ ok: true, token: 'fake-token' }); // en el futuro: usar JWT
    } else {
      // Login fallido
      res.status(401).json({ ok: false, error: 'Credenciales incorrectas' });
    }
  } catch (err) {
    console.error('❌ Error en /api/admin/login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
