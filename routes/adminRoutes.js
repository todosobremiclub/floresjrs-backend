const express = require('express');
const router = express.Router();
const db = require('../config/db');
const jwt = require('jsonwebtoken');

const secretKey = 'clave-secreta-supersegura'; // ⚠️ Debe coincidir con la del middleware

// POST /api/admin/login
router.post('/login', async (req, res) => {
  const { usuario, password } = req.body;

  try {
    const resultado = await db.query(
      'SELECT * FROM admins WHERE usuario = $1 AND contraseña = $2',
      [usuario, password]
    );

    if (resultado.rows.length > 0) {
      // Login exitoso → generar token válido por 8h
      const payload = { usuario: usuario };
      const token = jwt.sign(payload, secretKey, { expiresIn: '8h' });

      res.json({ ok: true, token });
    } else {
      // Login fallido
      res.status(401).json({ ok: false, error: 'Credenciales incorrectas' });
    }
  } catch (err) {
    console.error('❌ Error en /api/admin/login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /admin/verificar-token
const verificarToken = require('../middlewares/auth');
router.get('/verificar-token', verificarToken, (req, res) => {
  res.json({ mensaje: 'Token válido' });
});

module.exports = router;
