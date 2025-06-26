const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');

const bucket = admin.storage().bucket();

async function subirAFirebase(buffer, nombreOriginal) {
  const nombreArchivo = `${uuidv4()}-${nombreOriginal}`;
  const contentType = mime.lookup(nombreOriginal) || 'application/octet-stream';
  const token = uuidv4(); // importante

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

  const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(nombreArchivo)}?alt=media&token=${token}`;

  return { url };
}

module.exports = subirAFirebase;
