const express = require('express');
const router = express.Router();

// 🚨 Ruta de login de administrador (temporalmente hardcodeado)
router.post('/login', (req, res) => {
  const { usuario, password } = req.body;

  // Datos de acceso fijos por ahora
  if (usuario === 'admin' && password === 'admin123') {
    // En un sistema real se generaría un JWT aquí
    return res.json({ mensaje: 'Login exitoso', token: 'token_ficticio' });
  }

  res.status(401).json({ error: 'Credenciales inválidas' });
});

module.exports = router;
