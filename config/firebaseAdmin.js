const admin = require('firebase-admin');
const serviceAccount = require('./floresjrs-b6d5e-firebase-adminsdk-fbsvc-f7ff4d662d.json'); // Usa el nombre exacto de tu archivo

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

module.exports = admin;
