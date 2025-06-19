const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const upload = multer();
const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');

const bucket = admin.storage().bucket();

console.log("✅ socioRoutes.js se está ejecutando");

// GET /socio → obtener todos los socios
router.get('/', async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT 
         numero_socio AS numero,
         dni,
         nombre,
         apellido,
         subcategoria AS categoria,
         telefono,
         TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') AS nacimiento,
         TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso,
         foto_url,
         activo
       FROM socios
       ORDER BY numero_socio ASC`
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al listar socios:', err);
    res.status(500).json({ error: 'Error al obtener socios' });
  }
});

// GET /socio/:numero/:dni → consulta para Flutter (antiguo)
router.get('/:numero/:dni', async (req, res) => {
  const { numero, dni } = req.params;
  try {
    const resultado = await db.query(
      `SELECT 
         numero_socio AS numero,
         dni,
         CONCAT(nombre, ' ', apellido) AS nombre,
         subcategoria AS categoria,
         EXTRACT(YEAR FROM fecha_nacimiento)::text AS nacimiento,
         TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') AS ingreso,
         'Activo' AS estado,
         foto_url AS "fotoUrl",
         'Flores Jrs' AS club
       FROM socios 
       WHERE numero_socio = $1 AND dni = $2`,
      [numero, dni]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('❌ Error al buscar socio:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /socio/:id → obtener socio por número
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await db.query(
      `SELECT 
         numero_socio AS numero,
         dni,
         nombre,
         apellido,
         subcategoria AS categoria,
         telefono,
         TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') AS nacimiento,
         TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') AS ingreso,
         foto_url
       FROM socios
       WHERE numero_socio = $1`,
      [id]
    );

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('❌ Error al buscar socio por ID:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /socio → crear nuevo socio
router.post('/', async (req, res) => {
  const {
    numero_socio,
    dni,
    nombre,
    apellido,
    subcategoria,
    telefono,
    fecha_nacimiento,
    fecha_ingreso,
  } = req.body;

  try {
    await db.query(
      `INSERT INTO socios (
         numero_socio, dni, nombre, apellido,
         subcategoria, telefono, fecha_nacimiento, fecha_ingreso
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso]
    );

    res.status(201).json({ mensaje: 'Socio creado correctamente', numero: numero_socio });
  } catch (err) {
    console.error('❌ Error al crear socio:', err);
    res.status(500).json({ error: 'Error al crear socio' });
  }
});

// PUT /socio/:id → actualizar socio
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    dni,
    nombre,
    apellido,
    subcategoria,
    telefono,
    fecha_nacimiento,
    fecha_ingreso,
  } = req.body;

  try {
    await db.query(
      `UPDATE socios SET
         dni = $1,
         nombre = $2,
         apellido = $3,
         subcategoria = $4,
         telefono = $5,
         fecha_nacimiento = $6,
         fecha_ingreso = $7
       WHERE numero_socio = $8`,
      [dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, id]
    );

    res.json({ mensaje: 'Socio actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar socio:', err);
    res.status(500).json({ error: 'Error al actualizar socio' });
  }
});

// DELETE /socio/:id → eliminar socio
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM socios WHERE numero_socio = $1', [id]);
    res.json({ mensaje: 'Socio eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar socio:', err);
    res.status(500).json({ error: 'Error al eliminar socio' });
  }
});

// POST /socio/:id/foto → subir imagen a Firebase Storage
router.post('/:id/foto', upload.single('foto'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  try {
    const nombreArchivo = `socios/${id}_${uuidv4()}.jpg`;
    const file = bucket.file(nombreArchivo);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    await file.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${nombreArchivo}`;

    await db.query(
      'UPDATE socios SET foto_url = $1 WHERE numero_socio = $2',
      [publicUrl, id]
    );

    console.log('✅ Imagen subida a Firebase:', publicUrl);
    res.json({ mensaje: 'Imagen subida correctamente', url: publicUrl });
  } catch (err) {
    console.error('❌ Error al subir imagen a Firebase:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// POST /socio/login → login real para Flutter
router.post('/login', async (req, res) => {
  console.log('🔍 POST /socio/login body:', req.body);

  const { numero, dni } = req.body;

  try {
    const resultado = await db.query(
      `SELECT 
         numero_socio AS numero,
         dni,
         CONCAT(nombre, ' ', apellido) AS nombre,
         subcategoria AS categoria,
         EXTRACT(YEAR FROM fecha_nacimiento)::text AS nacimiento,
         TO_CHAR(fecha_ingreso, 'YYYY-MM-DD') AS ingreso,
         'Activo' AS estado,
         foto_url AS "fotoUrl",
         'Flores Jrs' AS club
       FROM socios
       WHERE numero_socio = $1 AND dni = $2
       LIMIT 1`,
      [numero, dni]
    );

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('❌ Error en /socio/login:', err.message);
    console.error(err.stack);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ✅ PUT /socio/estado/:numero → actualizar campo activo
router.put('/estado/:numero', async (req, res) => {
  const { numero } = req.params;
  const { activo } = req.body;

  try {
    await db.query(
      'UPDATE socios SET activo = $1 WHERE numero_socio = $2',
      [activo, numero]
    );
    res.json({ mensaje: 'Estado actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar estado del socio:', error);
    res.status(500).json({ error: 'Error al actualizar estado del socio' });
  }
});

module.exports = router;

