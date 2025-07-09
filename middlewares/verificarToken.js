// middlewares/verificarToken.js
const jwt = require('jsonwebtoken');
const claveSecreta = process.env.JWT_SECRET;
console.log('🧪 Clave secreta cargada:', claveSecreta);


module.exports = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  // 🔍 Log para ver qué llega
  console.log('🔐 Header Authorization recibido:', authHeader);

  if (!authHeader) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.split(' ')[1]
    : authHeader;

  if (!token) {
    return res.status(401).json({ error: 'Token inválido' });
  }

  try {
    const decoded = jwt.verify(token, claveSecreta);

    // 🔍 Log para ver si fue exitosamente decodificado
    console.log('✅ Token decodificado correctamente:', decoded);

    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ Error al verificar token:', err.message);
    return res.status(401).json({ error: 'Token no válido' });
  }
};
