const express = require('express');
const router = express.Router();
const admin = require('../config/firebaseAdmin'); // 🔗 Conexión con Firebase Admin
const verificarToken = require('../middlewares/verificarToken'); // 🔐 Asegura el acceso
const db = require('../config/db'); // 📦 Conexión a PostgreSQL

// POST /notificaciones/enviar → Enviar notificación y guardar en BD
router.post('/enviar', verificarToken, async (req, res) => {
  const { titulo, cuerpo } = req.body;

  if (!titulo || !cuerpo) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  const mensaje = {
    notification: {
      title: titulo,
      body: cuerpo,
    },
    topic: 'todos',
  };

  try {
    await admin.messaging().send(mensaje);

    // ✅ Guardar en la base de datos
    await db.query(
      `INSERT INTO notificaciones (titulo, cuerpo, fecha_envio) VALUES ($1, $2, NOW())`,
      [titulo, cuerpo]
    );

    res.json({ success: true, mensaje: 'Notificación enviada correctamente' });
  } catch (error) {
    console.error('❌ Error enviando notificación:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /notificaciones → Obtener historial
router.get('/', verificarToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT id, titulo, cuerpo, TO_CHAR(fecha_envio, 'DD/MM/YYYY HH24:MI') as fecha_envio
      FROM notificaciones
      ORDER BY fecha_envio DESC
      LIMIT 50
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Error al consultar historial:', error);
    res.status(500).json({ error: 'Error al obtener historial de notificaciones' });
  }
});

module.exports = router;

