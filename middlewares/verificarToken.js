// middlewares/verificarToken.js
const jwt = require('jsonwebtoken');
const claveSecreta = process.env.JWT_SECRET;

module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader; // usamos directamente el valor sin 'Bearer'
  if (!token) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, claveSecreta);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token no válido' });
  }
};
