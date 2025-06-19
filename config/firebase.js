const path = require('path');
const fs = require('fs');
const admin = require('firebase-admin');

// Definimos posibles rutas para el archivo de credenciales
const localPath = path.join(__dirname, 'firebase-service-account.json');
const renderPath = '/etc/secrets/firebase-service-account.json';

// Elegimos ruta según si existe
const saPath = fs.existsSync(localPath)
  ? localPath
  : fs.existsSync(renderPath)
    ? renderPath
    : null;

// Si no existe en ninguna, salimos con error
if (!saPath) {
  console.error('❌ No se encontró el Service Account en:', localPath, 'ni en', renderPath);
  process.exit(1);
}

const serviceAccount = require(saPath);

// ✅ Atención: el bucket debe terminar en .appspot.com
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: storageBucket: 'floresjrs-club-fotos',

});

module.exports = admin;


