const admin = require('firebase-admin');
const serviceAccount = require('./floresjrs-b6d5e-firebase-adminsdk-fbsvc-f7ff4d662d.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'floresjrs-b6d5e.appspot.com' // 📦 necesario para usar storage
});

module.exports = admin;
	