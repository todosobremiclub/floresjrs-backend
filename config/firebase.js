const admin = require('firebase-admin');

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountPath) {
  throw new Error('🚨 Falta configurar FIREBASE_SERVICE_ACCOUNT');
}

// Carga las credenciales desde la ruta del Secret File
const serviceAccount = require(serviceAccountPath);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'floresjrs-fcd20.appspot.com',
  });
}

module.exports = admin;
