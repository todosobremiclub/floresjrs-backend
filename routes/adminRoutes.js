const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  if (
    usuario === process.env.ADMIN_USER &&
    password === process.env.ADMIN_PASS
  ) {
    const payload = { usuario };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ ok: true, token });
  }

  res.status(401).json({ ok: false, error: 'Credenciales incorrectas' });
});

// GET /admin/verificar-token
router.get('/verificar-token', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Token requerido' });
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET);
    res.json({ mensaje: 'Token válido' });
  } catch {
    res.status(401).json({ error: 'Token inválido' });
  }
});

module.exports = router;

