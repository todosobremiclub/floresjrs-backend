const jwt = require('jsonwebtoken');
const secretKey = process.env.JWT_SECRET; // Usamos la clave desde .env

function verificarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Formato: "Bearer TOKEN"

  if (!token) return res.status(401).json({ mensaje: 'Token no proporcionado' });

  jwt.verify(token, secretKey, (err, usuario) => {
    if (err) return res.status(403).json({ mensaje: 'Token inválido' });
    req.usuario = usuario;
    next();
  });
}

module.exports = verificarToken;

