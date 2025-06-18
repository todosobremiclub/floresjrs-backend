require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const socioRoutes = require('./routes/socioRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 👉 Middlewares globales
app.use(cors()); // ✅ habilita CORS para Flutter Web
app.use(express.json()); // ✅ parsea JSON en el body

// 👉 Servir archivos estáticos (login y panel admin)
app.use('/admin-panel', express.static(path.join(__dirname, 'public/admin-panel')));

// 👉 Rutas API
app.use('/socio', socioRoutes);
app.use('/api/admin', adminRoutes);

// 👉 Redirección raíz según login
app.get('/', (req, res) => {
  if (req.session?.usuarioAdmin) {
    return res.redirect('/admin-panel/index.html');
  } else {
    return res.redirect('/admin-panel/login.html');
  }
});

// 👉 Protección directa del panel (opcional)
app.get('/admin-panel/index.html', (req, res, next) => {
  if (!req.session?.usuarioAdmin) {
    return res.redirect('/admin-panel/login.html');
  }
  next(); // permitir acceso si está logueado
});

// 👉 Ruta de diagnóstico DB (opcional)
app.get('/test-db', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Conectado a PostgreSQL!', hora: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

// 👉 Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en puerto ${PORT}`);
  console.log('📡 Rutas disponibles:');

  app._router.stack.forEach((middleware) => {
    if (middleware.route) {
      const { path } = middleware.route;
      const method = middleware.route.stack[0].method.toUpperCase();
      console.log(`[RUTA] ${method} ${path}`);
    }
  });
});
