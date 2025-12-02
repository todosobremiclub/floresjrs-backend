
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const multer = require('multer');
const upload = multer();
const { v4: uuidv4 } = require('uuid');
const verificarToken = require('../middlewares/verificarToken');
const subirAFirebase = require('../utils/subirAFirebase');
const ExcelJS = require('exceljs'); // ✅ Nueva dependencia para exportar Excel

console.log("✅ socioRoutes.js se está ejecutando");

// -------------------- RUTAS EXISTENTES --------------------

// GET /socio/ultimo-numero → obtener el próximo número de socio (protegido)
router.get('/ultimo-numero', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query('SELECT MAX(numero_socio) AS ultimo FROM socios');
    const ultimo = resultado.rows[0].ultimo || 0;
    const siguiente = ultimo + 1;
    res.json({ siguiente });
  } catch (err) {
    console.error('❌ Error al obtener último número de socio:', err);
    res.status(500).json({ error: 'Error al obtener número de socio' });
  }
});

// GET /socio → obtener todos los socios con pagos mensuales (protegido)
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT 
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
      ORDER BY s.numero_socio ASC
    `);
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
    const resultado = await db.query(`
      SELECT 
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
      WHERE numero_socio = $1`, [id]);

    if (resultado.rows.length === 0) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    const socio = resultado.rows[0];
    if (!socio.activo) {
      return res.status(403).json({ error: 'Este socio está inactivo y no puede acceder a la app' });
    }

    res.json(socio);
  } catch (err) {
    console.error('❌ Error al buscar socio por ID:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /socio → crear nuevo socio (protegido)
router.post('/', verificarToken, async (req, res) => {
  const { numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, becado } = req.body;
  try {
    const dniExiste = await db.query('SELECT 1 FROM socios WHERE dni = $1', [dni]);
    if (dniExiste.rows.length > 0) return res.status(400).json({ error: 'Ya existe un socio con ese DNI' });

    const numExiste = await db.query('SELECT 1 FROM socios WHERE numero_socio = $1', [numero_socio]);
    if (numExiste.rows.length > 0) return res.status(400).json({ error: 'Ya existe un socio con ese número' });

    await db.query(`
      INSERT INTO socios (numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, becado)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, becado]);

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
    if (req.body.activo !== undefined && Object.keys(req.body).length === 1) {
      await db.query(`UPDATE socios SET activo = $1 WHERE numero_socio = $2`, [req.body.activo, id]);
      return res.json({ mensaje: 'Estado actualizado correctamente' });
    }
    if (req.body.becado !== undefined && Object.keys(req.body).length === 1) {
      await db.query(`UPDATE socios SET becado = $1 WHERE numero_socio = $2`, [req.body.becado, id]);
      return res.json({ mensaje: 'Estado de beca actualizado correctamente' });
    }
    const { numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, becado } = req.body;
    await db.query(`
      UPDATE socios SET numero_socio=$1,dni=$2,nombre=$3,apellido=$4,subcategoria=$5,telefono=$6,fecha_nacimiento=$7,fecha_ingreso=$8,activo=$9,becado=$10
      WHERE numero_socio=$11`,
      [numero_socio, dni, nombre, apellido, subcategoria, telefono, fecha_nacimiento, fecha_ingreso, activo, becado, id]);
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

// POST /socio/:id/foto → subir imagen (protegido)
router.post('/:id/foto', verificarToken, upload.single('foto'), async (req, res) => {
  const { id } = req.params;
  if (!req.file) return res.status(400).json({ error: 'No se envió ninguna imagen' });
  try {
    const { url } = await subirAFirebase(req.file.buffer, req.file.originalname);
    await db.query('UPDATE socios SET foto_url = $1 WHERE numero_socio = $2', [url, id]);
    res.json({ mensaje: 'Foto subida correctamente', url });
  } catch (err) {
    console.error('❌ Error al subir imagen:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// POST /socio/login → login real para Flutter (sin protección)
router.post('/login', async (req, res) => {
  const { numero, dni } = req.body;
  try {
    const resultado = await db.query(`
      SELECT numero_socio AS numero,dni,CONCAT(nombre,' ',apellido) AS nombre,subcategoria AS categoria,
      EXTRACT(YEAR FROM fecha_nacimiento)::text AS nacimiento,TO_CHAR(fecha_ingreso,'YYYY-MM-DD') AS ingreso,
      'Activo' AS estado,foto_url AS "fotoUrl",'Flores Jrs' AS club
      FROM socios WHERE numero_socio=$1 AND dni=$2 AND activo=true LIMIT 1`, [numero, dni]);
    if (resultado.rows.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas' });

    const socio = resultado.rows[0];
    const pagos = await db.query('SELECT anio, mes FROM pagos_mensuales WHERE socio_numero=$1 ORDER BY anio DESC, mes DESC LIMIT 1', [socio.numero]);
    let ultimoPago = '', alDia = false;
    if (pagos.rows.length > 0) {
      const { anio, mes } = pagos.rows[0];
      const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      ultimoPago = `${meses[mes-1]}-${anio}`;
      const hoy = new Date();
      const fechaPago = new Date(anio, mes-1);
      const diferenciaMeses = hoy.getFullYear()*12+hoy.getMonth()-(fechaPago.getFullYear()*12+fechaPago.getMonth());
      alDia = diferenciaMeses <= 1;
    }
    const jwt = require('jsonwebtoken');
    const token = jwt.sign({ numero: socio.numero, dni: socio.dni }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ socio: { ...socio, ultimoPago, alDia }, token });
  } catch (err) {
    console.error('❌ Error en /socio/login:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /socio/:numero/:dni → para Flutter (sin protección)
router.get('/:numero/:dni', async (req, res) => {
  const { numero, dni } = req.params;
  try {
    const resultado = await db.query(`
      SELECT numero_socio AS numero,dni,CONCAT(nombre,' ',apellido) AS nombre,subcategoria AS categoria,
      EXTRACT(YEAR FROM fecha_nacimiento)::text AS nacimiento,TO_CHAR(fecha_ingreso,'YYYY-MM-DD') AS ingreso,
      'Activo' AS estado,foto_url AS "fotoUrl",'Flores Jrs' AS club
      FROM socios WHERE numero_socio=$1 AND dni=$2 AND activo=true`, [numero, dni]);
    if (resultado.rows.length === 0) return res.status(404).json({ error: 'Socio no encontrado' });
    res.json(resultado.rows[0]);
  } catch (err) {
    console.error('❌ Error al buscar socio:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /socio/paginado → obtener socios paginados con filtros
router.get('/paginado', verificarToken, async (req, res) => {
  const page = parseInt(req.query.page || '1');
  const limit = parseInt(req.query.limit || '50');
  const offset = (page - 1) * limit;
  const categoria = req.query.categoria;
  const anio = req.query.anio;
  const buscar = (req.query.buscar || '').toLowerCase();
  try {
    let filtros = 'WHERE s.activo = true';
    const params = [];
    if (categoria) { filtros += ` AND s.subcategoria = $${params.length+1}`; params.push(categoria); }
    if (anio) { filtros += ` AND EXTRACT(YEAR FROM s.fecha_nacimiento) = $${params.length+1}`; params.push(anio); }
    if (buscar) { filtros += ` AND (LOWER(s.nombre)||' '||LOWER(s.apellido)||' '||s.dni::text) LIKE $${params.length+1}`; params.push(`%${buscar}%`); }
    const totalRes = await db.query(`SELECT COUNT(*) FROM socios s ${filtros}`, params);
    const total = parseInt(totalRes.rows[0].count);
    const totalPages = Math.ceil(total / limit);
    const sociosRes = await db.query(`
      SELECT s.numero_socio AS numero,s.dni,s.nombre,s.apellido,s.subcategoria AS categoria,s.telefono,
      TO_CHAR(s.fecha_nacimiento,'YYYY-MM-DD') AS nacimiento,TO_CHAR(s.fecha_ingreso,'YYYY-MM-DD') AS fecha_ingreso,
      s.foto_url,s.activo,s.becado,COALESCE(ARRAY_AGG(TO_CHAR(pm.anio,'FM0000')||'-'||TO_CHAR(pm.mes,'FM00')) FILTER (WHERE pm.id IS NOT NULL),'{}') AS pagos
      FROM socios s LEFT JOIN pagos_mensuales pm ON s.numero_socio=pm.socio_numero ${filtros}
      GROUP BY s.numero_socio,s.dni,s.nombre,s.apellido,s.subcategoria,s.telefono,s.fecha_nacimiento,s.fecha_ingreso,s.foto_url,s.activo,s.becado
      ORDER BY s.numero_socio ASC LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limit, offset]);
    res.json({ socios: sociosRes.rows, total, page, pages: totalPages });
  } catch (err) {
    console.error('❌ Error en /socio/paginado:', err);
    res.status(500).json({ error: 'Error al obtener socios paginados' });
  }
});

// -------------------- NUEVA RUTA: EXPORTAR EXCEL --------------------
router.get('/exportar-excel', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT s.numero_socio AS numero,s.dni,s.nombre,s.apellido,s.subcategoria AS categoria,s.telefono,
      TO_CHAR(s.fecha_nacimiento,'YYYY-MM-DD') AS nacimiento,TO_CHAR(s.fecha_ingreso,'YYYY-MM-DD') AS ingreso,
      s.activo,s.becado,COALESCE(ARRAY_AGG(TO_CHAR(pm.anio,'FM0000')||'-'||TO_CHAR(pm.mes,'FM00')) FILTER (WHERE pm.id IS NOT NULL),'{}') AS pagos
      FROM socios s LEFT JOIN pagos_mensuales pm ON s.numero_socio=pm.socio_numero
      GROUP BY s.numero_socio,s.dni,s.nombre,s.apellido,s.subcategoria,s.telefono,s.fecha_nacimiento,s.fecha_ingreso,s.activo,s.becado
      ORDER BY s.numero_socio ASC`);
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Socios');
    worksheet.columns = [
      { header: 'Número', key: 'numero', width: 10 },
      { header: 'DNI', key: 'dni', width: 12 },
      { header: 'Nombre', key: 'nombre', width: 20 },
      { header: 'Apellido', key: 'apellido', width: 20 },
      { header: 'Categoría', key: 'categoria', width: 15 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Nacimiento', key: 'nacimiento', width: 15 },
      { header: 'Ingreso', key: 'ingreso', width: 15 },
      { header: 'Activo', key: 'activo', width: 10 },
      { header: 'Becado', key: 'becado', width: 10 },
      { header: 'Pagos', key: 'pagos', width: 30 }
    ];
    resultado.rows.forEach(socio => worksheet.addRow({ ...socio, pagos: socio.pagos.join(', ') }));
    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename="socios.xlsx"');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error('❌ Error al exportar Excel:', err);
    res.status(500).json({ error: 'Error al generar Excel' });
  }
});

module.exports = router;

