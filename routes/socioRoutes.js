const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const upload = multer();
const { v4: uuidv4 } = require('uuid');
const verificarToken = require('../middlewares/verificarToken');
const subirAImgur = require('../utils/subirAImgur');




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
         activo,
         becado
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
         activo,
         becado
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
    activo,
    becado
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
         subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, becado
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, becado]
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
  try {
    const id = req.params.id;

    // Si solo se quiere actualizar el estado activo
    if (req.body.activo !== undefined && Object.keys(req.body).length === 1) {
      await db.query(`UPDATE socios SET activo = $1 WHERE numero_socio = $2`, [
        req.body.activo,
        id
      ]);
      return res.json({ mensaje: 'Estado actualizado correctamente' });
    }

    // Resto de los campos para edición completa
    const {
      numero_socio,
      dni,
      nombre,
      apellido,
      subcategoria,
      telefono,
      fecha_nacimiento,
      fecha_ingreso,
      activo,
      becado
    } = req.body;

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
        activo = $9,
        becado = $10
      WHERE numero_socio = $11`,
      [
        numero_socio,
        dni,
        nombre,
        apellido,
        subcategoria,
        telefono,
        fecha_nacimiento,
        fecha_ingreso,
        activo,
        becado,
        id
      ]
    );

    res.json({ mensaje: 'Socio actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar socio:', error);
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

// POST /socio/:id/foto → subir imagen a Imgur (protegido)
router.post('/:id/foto', verificarToken, upload.single('foto'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  try {
    const imagenUrl = await subirAImgur(req.file.buffer);

    await db.query(
      'UPDATE socios SET foto_url = $1 WHERE numero_socio = $2',
      [imagenUrl, id]
    );

    res.json({ mensaje: 'Foto subida correctamente', url: imagenUrl });
  } catch (err) {
    console.error('❌ Error al subir a Imgur:', err.message);
    res.status(500).json({ error: 'Error al subir imagen' });
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



