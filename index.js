require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const socioRoutes = require('./routes/socioRoutes');
const adminRoutes = require('./routes/adminRoutes');
const pagosRoutes = require('./routes/pagosRoutes'); // 👉 nueva línea
const montoRoutes = require('./routes/montoRoutes'); // 👉 para monto fijo

const app = express();
const PORT = process.env.PORT || 3000;

// 👉 Middlewares globales
app.use(cors());
app.use(express.json());


// 👉 Servir login y panel admin (sin proteger el login)
app.use('/admin-panel', express.static(path.join(__dirname, 'public/admin-panel')));

// 👉 Servir cualquier otro archivo público (por ejemplo imágenes u otros)
app.use(express.static(path.join(__dirname, 'public')));

// 👉 Rutas API
app.use('/socio', socioRoutes);            // Rutas protegidas
app.use('/api/admin', adminRoutes);        // Login admin
app.use('/pagos', pagosRoutes);            // 👉 NUEVA ruta para pagos
app.use('/api/monto', montoRoutes); // 👉 para obtener y actualizar el monto
app.use('/config/categorias', require('./routes/categoriasRoutes'));

// 👉 Redirección raíz
app.get('/', (req, res) => {
  res.redirect('/admin-panel/login.html');
});

// 👉 Ruta de diagnóstico
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

