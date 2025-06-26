const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const upload = multer();
const { v4: uuidv4 } = require('uuid');
const verificarToken = require('../middlewares/verificarToken');
const subirAFirebase = require('../utils/subirAFirebase');





console.log("✅ socioRoutes.js se está ejecutando");

// GET /socio → obtener todos los socios con pagos mensuales (protegido)
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT 
         s.numero_socio AS numero,
         s.dni,
         s.nombre,
         s.apellido,
         s.subcategoria AS categoria,
         s.telefono,
         TO_CHAR(s.fecha_nacimiento, 'YYYY-MM-DD') AS nacimiento,
         TO_CHAR(s.fecha_ingreso, 'YYYY-MM-DD') AS fecha_ingreso,
         s.foto_url,
         s.activo,
         s.becado,
         COALESCE(ARRAY_AGG(
           TO_CHAR(pm.anio, 'FM0000') || '-' || TO_CHAR(pm.mes, 'FM00')
         ) FILTER (WHERE pm.id IS NOT NULL), '{}') AS pagos
       FROM socios s
       LEFT JOIN pagos_mensuales pm ON s.numero_socio = pm.socio_numero
       GROUP BY s.numero_socio, s.dni, s.nombre, s.apellido, s.subcategoria, s.telefono, s.fecha_nacimiento, s.fecha_ingreso, s.foto_url, s.activo, s.becado
       ORDER BY s.numero_socio ASC`
    );

    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al listar socios:', err);
    res.status(500).json({ error: 'Error al obtener socios' });
  }
});
;

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
router.put('/:id', verificarToken, async (req, res) => {
  try {
    const id = req.params.id;

    // ✅ Solo actualizar "activo"
    if (req.body.activo !== undefined && Object.keys(req.body).length === 1) {
      await db.query(`UPDATE socios SET activo = $1 WHERE numero_socio = $2`, [
        req.body.activo,
        id
      ]);
      return res.json({ mensaje: 'Estado actualizado correctamente' });
    }

    // ✅ Solo actualizar "becado"
    if (req.body.becado !== undefined && Object.keys(req.body).length === 1) {
      await db.query(`UPDATE socios SET becado = $1 WHERE numero_socio = $2`, [
        req.body.becado,
        id
      ]);
      return res.json({ mensaje: 'Estado de beca actualizado correctamente' });
    }

    // 🛠️ Edición completa
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

// POST /socio/:id/foto → subir imagen  (protegido)
router.post('/:id/foto', verificarToken, upload.single('foto'), async (req, res) => {
  const { id } = req.params;

  if (!req.file) {
    return res.status(400).json({ error: 'No se envió ninguna imagen' });
  }

  try {
    const imagenUrl = await subirAFirebase(req.file.buffer, req.file.originalname);

    await db.query(
      'UPDATE socios SET foto_url = $1 WHERE numero_socio = $2',
      [imagenUrl, id]
    );

    res.json({ mensaje: 'Foto subida correctamente', url: imagenUrl });
  } catch (err) {
    console.error('❌ Error real al subir imagen:', err); // 👈 log completo
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// POST /socio/login → login real para Flutter (sin protección)
router.post('/login', async (req, res) => {
  const { numero, dni } = req.body;

  try {
    const resultado = await db.query(`
      SELECT 
        s.numero_socio AS numero,
        s.dni,
        CONCAT(s.nombre, ' ', s.apellido) AS nombre,
        s.subcategoria AS categoria,
        EXTRACT(YEAR FROM s.fecha_nacimiento)::text AS nacimiento,
        TO_CHAR(s.fecha_ingreso, 'YYYY-MM-DD') AS ingreso,
        s.foto_url AS "fotoUrl",
        'Flores Jrs' AS club,
        MAX(pm.anio * 100 + pm.mes) AS ultimo_pago
      FROM socios s
      LEFT JOIN pagos_mensuales pm ON s.numero_socio = pm.socio_numero
      WHERE s.numero_socio = $1 AND s.dni = $2
      GROUP BY s.numero_socio, s.dni, s.nombre, s.apellido, s.subcategoria, s.fecha_nacimiento, s.fecha_ingreso, s.foto_url
      LIMIT 1
    `, [numero, dni]);

    if (resultado.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const socio = resultado.rows[0];

    // Convertimos a texto legible
    const ultimoPago = socio.ultimo_pago
      ? `${String(socio.ultimo_pago).substring(4)}/${String(socio.ultimo_pago).substring(0, 4)}`
      : 'Sin pagos';

    // Determinar si está al día (último pago en el mes actual o anterior)
    const hoy = new Date();
    const actual = hoy.getFullYear() * 100 + (hoy.getMonth() + 1);
    const alDia = socio.ultimo_pago && socio.ultimo_pago >= actual - 1;

    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ numero: socio.numero, dni: socio.dni }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      socio: {
        numero: socio.numero,
        dni: socio.dni,
        nombre: socio.nombre,
        categoria: socio.categoria,
        nacimiento: socio.nacimiento,
        ingreso: socio.ingreso,
        fotoUrl: socio.fotoUrl,
        club: socio.club,
        ultimoPago,
        alDia
      },
      token
    });
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



