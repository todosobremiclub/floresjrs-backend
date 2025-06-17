const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Ruta al Secret File montado por Render
const saPath =
  process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
  path.join(__dirname, '../firebase-service-account.json') ||
  '/etc/secrets/firebase-service-account.json';

if (!fs.existsSync(saPath)) {
  console.error('❌ No se encontró el Service Account en:', saPath);
  process.exit(1);
}

const serviceAccount = require(saPath);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'floresjrs-b43c7.firebasestorage.app'
});

module.exports = admin;

