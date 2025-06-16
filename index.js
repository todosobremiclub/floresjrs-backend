require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./config/db');
const socioRoutes = require('./routes/socioRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Rutas API
app.use('/socio', socioRoutes);
app.use('/api/admin', adminRoutes);


// 👉 Servir archivos estáticos (login, panel admin)
app.use('/admin-panel', express.static(path.join(__dirname, 'public/admin-panel')));

// Ruta de prueba para conexión a la base de datos
app.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT NOW()');
    res.json({ message: 'Conectado a PostgreSQL!', hora: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al conectar con la base de datos' });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor backend corriendo en puerto ${PORT}`);

  // Mostrar rutas activas
  app._router.stack.forEach((r) => {
    if (r.route) {
      const method = r.route.stack[0].method.toUpperCase();
      const path = r.route.path;
      console.log(`[RUTA] ${method} ${path}`);
    }
  });
});


