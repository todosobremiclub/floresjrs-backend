const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const bucket = admin.storage().bucket();

async function subirAFirebase(buffer, nombreOriginal) {
  const nombreArchivo = `${uuidv4()}-${nombreOriginal}`;
  const archivo = bucket.file(nombreArchivo);

  // Detectar tipo MIME según extensión del archivo
  const extension = nombreOriginal.toLowerCase().split('.').pop();
  const contentType =
    extension === 'png' ? 'image/png' :
    extension === 'jpg' || extension === 'jpeg' ? 'image/jpeg' :
    'application/octet-stream'; // fallback por si acaso

  await archivo.save(buffer, {
    metadata: {
      contentType: contentType,
      metadata: {
        firebaseStorageDownloadTokens: uuidv4(), // token para URL pública
      }
    }
  });

  // 🔗 Construir URL pública
  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(nombreArchivo)}?alt=media`;

  return url;
}

module.exports = subirAFirebase;
