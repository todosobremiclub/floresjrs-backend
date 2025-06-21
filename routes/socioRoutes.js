const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const upload = multer();
const admin = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const verificarToken = require('../middlewares/verificarToken');

const bucket = admin.storage().bucket();

console.log("✅ socioRoutes.js se está ejecutando");

// GET /socio → obtener todos los socios (protegido)
router.get('/', verificarToken, async (req, res) => {
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

// GET /socio/:id → obtener socio por número (protegido)
router.get('/:id', verificarToken, async (req, res) => {
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
         foto_url,
         activo
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

// POST /socio → crear nuevo socio (protegido)
router.post('/', verificarToken, async (req, res) => {
  const {
    numero_socio,
    dni,
    nombre,
    apellido,
    subcategoria,
    telefono,
    fecha_nacimiento,
    fecha_ingreso,
    activo
  } = req.body;

  try {
    // 🔒 Verificar si ya existe un socio con ese DNI
const dniExiste = await db.query('SELECT 1 FROM socios WHERE dni = $1', [dni]);
if (dniExiste.rows.length > 0) {
  return res.status(400).json({ error: 'Ya existe un socio con ese DNI' });
}

// 🔒 Verificar si ya existe un socio con ese número
const numExiste = await db.query('SELECT 1 FROM socios WHERE numero_socio = $1', [numero_socio]);
if (numExiste.rows.length > 0) {
  return res.status(400).json({ error: 'Ya existe un socio con ese número' });
}


    await db.query(
      `INSERT INTO socios (
         numero_socio, dni, nombre, apellido,
         subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo]
    );

    res.status(201).json({ mensaje: 'Socio creado correctamente', numero: numero_socio });
  } catch (err) {
    console.error('❌ Error al crear socio:', err);
    res.status(500).json({ error: 'Error al crear socio' });
  }
});

// PUT /socio/:id → actualizar socio (protegido)
// PUT /socio/:id → actualizar socio (protegido)
router.put('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  const {
    numero_socio,
    dni,
    nombre,
    apellido,
    subcategoria,
    telefono,
    fecha_nacimiento,
    fecha_ingreso,
    activo
  } = req.body;

  try {
    // 🔒 Validar que el DNI no esté en uso por otro socio
    const dniExiste = await db.query(
      'SELECT 1 FROM socios WHERE dni = $1 AND numero_socio != $2',
      [dni, id]
    );
    if (dniExiste.rows.length > 0) {
      return res.status(400).json({ error: 'Ya existe otro socio con ese DNI' });
    }

    // 🔒 Validar que el número de socio no esté en uso por otro
    const numExiste = await db.query(
      'SELECT 1 FROM socios WHERE numero_socio = $1 AND numero_socio != $2',
      [numero_socio, id]
    );
    if (numExiste.rows.length > 0) {
      return res.status(400).json({ error: 'Ese número de socio ya está asignado a otro' });
    }

    await db.query(
      `UPDATE socios SET
         numero_socio = $1,
         dni = $2,
         nombre = $3,
         apellido = $4,
         subcategoria = $5,
         telefono = $6,
         fecha_nacimiento = $7,
         fecha_ingreso = $8,
         activo = $9
       WHERE numero_socio = $10`,
      [numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, id]
    );

    res.json({ mensaje: 'Socio actualizado correctamente' });
  } catch (err) {
    console.error('❌ Error al actualizar socio:', err);
    res.status(500).json({ error: 'Error al actualizar socio' });
  }
});

// PUT /socio/estado/:numero → cambiar estado activo/inactivo (protegido)
router.put('/estado/:numero', verificarToken, async (req, res) => {
  const { numero } = req.params;
  const { activo } = req.body;

  try {
    await db.query('UPDATE socios SET activo = $1 WHERE numero_socio = $2', [activo, numero]);
    res.json({ mensaje: 'Estado actualizado' });
  } catch (err) {
    console.error('❌ Error al cambiar estado del socio:', err);
    res.status(500).json({ error: 'Error al cambiar estado' });
  }
});

// DELETE /socio/:id → eliminar socio (protegido)
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM socios WHERE numero_socio = $1', [id]);
    res.json({ mensaje: 'Socio eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar socio:', err);
    res.status(500).json({ error: 'Error al eliminar socio' });
  }
});

// POST /socio/:id/foto → subir imagen a Firebase Storage (protegido)
router.post('/:id/foto', verificarToken, upload.single('foto'), async (req, res) => {
  const { id } = req.params;

  console.log('🔍 Subiendo imagen para socio', id);
  if (!req.file) {
    console.error('⚠️ No llegó el archivo');
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  try {
    const nombreArchivo = `socios/${id}_${uuidv4()}.jpg`;
    const file = bucket.file(nombreArchivo);

    console.log('📤 Guardando archivo en bucket:', bucket.name, nombreArchivo);

    await file.save(req.file.buffer, {
      metadata: { contentType: req.file.mimetype },
    });

    // ✅ Hacer el archivo público
    await file.makePublic();

    // ✅ URL pública permanente
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${nombreArchivo}`;

    // ✅ Guardar en la base de datos
    await db.query(
      'UPDATE socios SET foto_url = $1 WHERE numero_socio = $2',
      [publicUrl, id]
    );

    console.log('✅ Imagen subida a Firebase:', publicUrl);
    res.json({ mensaje: 'Imagen subida correctamente', url: publicUrl });
  } catch (err) {
    console.error('❌ Error al subir imagen a Firebase:', err.message, err);
    res.status(500).json({ error: `Error al subir imagen: ${err.message}` });
  }
});

// POST /socio/login → login real para Flutter (sin protección)
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /socio/:numero/:dni → para Flutter (sin protección) [MOVER AL FINAL]
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

module.exports = router;



