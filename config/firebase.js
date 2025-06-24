const admin = require('firebase-admin');

const base64 = process.env.FIREBASE_CREDENTIAL_BASE64;
const json = Buffer.from(base64, 'base64').toString('utf8');
const serviceAccount = JSON.parse(json); // 🔥 Este sí es JSON

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'floresjrs-b6d5e.appspot.com'
});

module.exports = admin;

