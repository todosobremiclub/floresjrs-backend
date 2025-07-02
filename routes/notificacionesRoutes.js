const express = require('express');
const router = express.Router();
const admin = require('../config/firebaseAdmin'); // 🔗 Conexión con Firebase Admin
const verificarToken = require('../middlewares/verificarToken'); // 🔐 Asegura el acceso

// POST /notificaciones/enviar
router.post('/enviar', verificarToken, async (req, res) => {
  const { titulo, cuerpo } = req.body;

  const mensaje = {
    notification: {
      title: titulo,
      body: cuerpo,
    },
    topic: 'todos', // Enviaremos a todos los suscritos al topic "todos"
  };

  try {
    const response = await admin.messaging().send(mensaje);
    res.json({ success: true, response });
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
