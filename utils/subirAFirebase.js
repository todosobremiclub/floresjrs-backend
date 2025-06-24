const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const bucket = admin.storage().bucket();

async function subirAFirebase(buffer, nombreOriginal) {
  const nombreArchivo = `${uuidv4()}-${nombreOriginal}`;
  const archivo = bucket.file(nombreArchivo);

  await archivo.save(buffer, {
    metadata: {
      contentType: 'image/jpeg', // Cambiar si subís PNG
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(), // Token para generar URL pública
      }
    }
  });

  // 🔗 Construir URL pública
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(nombreArchivo)}?alt=media`;

  return url;
}

module.exports = subirAFirebase;
