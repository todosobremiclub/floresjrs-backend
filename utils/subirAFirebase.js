const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const bucket = admin.storage().bucket();
const bucketPublic = 'floresjrs-b6d5e.appspot.com'; // 👈 clave para URL pública

async function subirAFirebase(buffer, nombreOriginal) {
  const nombreArchivo = `${uuidv4()}-${nombreOriginal}`;
  const contentType = mime.lookup(nombreOriginal) || 'application/octet-stream';
  const token = uuidv4();

  const archivo = bucket.file(nombreArchivo);

  await archivo.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
    resumable: false,
  });

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucketPublic}/o/${encodeURIComponent(nombreArchivo)}?alt=media&token=${token}`;

  return { url };
}

module.exports = subirAFirebase;

