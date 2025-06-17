// controllers/uploadController.js
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs');

// Inicializar Firebase solo una vez
const serviceAccount = require('../config/firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'floresjrs-fcd20.appspot.com'
  });
}

const bucket = admin.storage().bucket();

const uploadFoto = async (req, res) => {
  try {
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

    const extension = path.extname(file.originalname);
    const nombreFinal = `fotos_socios/${uuidv4()}${extension}`;
    const tempPath = path.join(__dirname, '..', 'uploads', nombreFinal);

    // Guardar temporalmente el archivo
    fs.writeFileSync(tempPath, file.buffer);

    // Subir a Firebase
    await bucket.upload(tempPath, {
      destination: nombreFinal,
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: uuidv4()
        }
      }
    });

    // Construir URL pública
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(nombreFinal)}?alt=media`;

    // Borrar archivo temporal
    fs.unlinkSync(tempPath);

    res.json({ mensaje: 'Foto subida correctamente', url });
  } catch (error) {
    console.error('❌ Error al subir foto:', error);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
};

module.exports = uploadFoto;
