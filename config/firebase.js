const admin = require('firebase-admin');
const serviceAccount = require('./firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'floresjrs-fcd20.appspot.com',
});

module.exports = admin;
