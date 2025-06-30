const express = require('express');
const router = express.Router();
const db = require('../config/db');
const verificarToken = require('../middlewares/verificarToken');
const { getMonto, setMonto } = require('../config/montoCuota');

// 👉 Obtener monto actual
router.get('/monto', verificarToken, async (req, res) => {
  try {
    const monto = await getMonto();
    res.json({ monto });
  } catch (err) {
    console.error('❌ Error al obtener monto:', err);
    res.status(500).json({ error: 'Error al obtener monto' });
  }
});

// 👉 Actualizar monto
router.post('/monto', verificarToken, async (req, res) => {
  const { monto } = req.body;
  if (typeof monto !== 'number' || monto <= 0) {
    return res.status(400).json({ error: 'Monto inválido' });
  }

  await setMonto(monto);
  res.json({ mensaje: 'Monto actualizado correctamente' });
});

// ⚠️ Ruta temporal para ver contenido de la tabla pagos
router.get('/debug/ver-pagos', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query('SELECT * FROM pagos ORDER BY id DESC LIMIT 20');
    res.json(resultado.rows);
  } catch (err) {
    console.error('Error al consultar pagos:', err);
    res.status(500).json({ error: 'Error al consultar pagos' });
  }
});


// 👉 Registrar nuevo pago general (tabla pagos)
router.post('/', verificarToken, async (req, res) => {
  const { socio_id, fecha_pago, monto } = req.body;

  if (!socio_id || !fecha_pago) {
    return res.status(400).json({ error: 'Datos incompletos' });
  }

  let montoFinal = monto;
  if (!montoFinal || isNaN(montoFinal)) {
    try {
      const resultado = await db.query(`SELECT valor FROM configuracion WHERE clave = 'monto_cuota'`);
      montoFinal = parseFloat(resultado.rows[0]?.valor || '0');
    } catch (err) {
      console.error('❌ Error al obtener monto de cuota desde configuración', err);
      return res.status(500).json({ error: 'Error al obtener monto de cuota' });
    }
  }

  try {
    await db.query(
      `INSERT INTO pagos (socio_id, fecha_pago, monto, observaciones)
       VALUES ($1, $2, $3, $4)`,
      [socio_id, fecha_pago, montoFinal, 'admin']
    );
    res.status(201).json({ mensaje: 'Pago registrado correctamente' });
  } catch (err) {
    console.error('❌ Error al registrar pago:', err);
    res.status(500).json({ error: 'Error al registrar pago' });
  }
});

// 👉 Registrar pagos mensuales (evita duplicados)
router.post('/mensuales', verificarToken, async (req, res) => {
  const { numeroSocio, meses } = req.body;

  if (!numeroSocio || !Array.isArray(meses) || meses.length === 0) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }

  try {
    const existentes = await db.query(
      `SELECT anio, mes FROM pagos_mensuales WHERE socio_numero = $1`,
      [numeroSocio]
    );

    const yaPagados = new Set(
      existentes.rows.map(row => `${row.anio}-${row.mes.toString().padStart(2, '0')}`)
    );

    const nuevosMeses = meses.filter(m => !yaPagados.has(m));

    if (nuevosMeses.length === 0) {
      return res.status(200).json({ mensaje: 'No hay meses nuevos para registrar' });
    }

    const valoresFinales = [];
const placeholders = [];

for (let i = 0; i < nuevosMeses.length; i++) {
  const [anioStr, mesStr] = nuevosMeses[i].split('-');
  const anio = parseInt(anioStr);
  const mes = parseInt(mesStr);

  // Buscar monto para ese mes
  const montoRes = await db.query(
    'SELECT monto FROM montos_mensuales WHERE mes = $1 AND anio = $2',
    [mes, anio]
  );

  const monto = montoRes.rows[0]?.monto ?? 0;

  // Agregar valores
  placeholders.push(`($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`);
  valoresFinales.push(numeroSocio, anio, mes, monto, new Date()); // fecha actual
}

const query = `
  INSERT INTO pagos_mensuales (socio_numero, anio, mes, monto, fecha_pago)
  VALUES ${placeholders.join(', ')}
`;

await db.query(query, valoresFinales);


    res.json({ mensaje: 'Meses registrados correctamente' });
  } catch (error) {
    console.error('❌ Error al registrar pagos mensuales:', error);
    res.status(500).json({ error: 'Error al registrar pagos mensuales' });
  }
});

// 👉 Obtener meses abonados por un socio (incluye ID)
router.get('/mensuales/:numeroSocio', verificarToken, async (req, res) => {
  const { numeroSocio } = req.params;

  try {
    const resultado = await db.query(
      `SELECT id, anio, mes
       FROM pagos_mensuales
       WHERE socio_numero = $1
       ORDER BY anio, mes`,
      [numeroSocio]
    );

    const mesesPagados = resultado.rows.map(row => ({
      id: row.id,
      anio: row.anio,
      mes: row.mes.toString().padStart(2, '0')
    }));

    res.json(mesesPagados);
  } catch (err) {
    console.error('❌ Error al obtener meses abonados:', err);
    res.status(500).json({ error: 'Error al obtener meses abonados' });
  }
});

// 👉 Obtener todos los pagos (tabla pagos)
router.get('/', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(
      `SELECT 
         p.id,
         p.socio_id,
         s.nombre || ' ' || s.apellido AS nombre,
         TO_CHAR(p.fecha_pago, 'YYYY-MM-DD') AS fecha_pago,
         p.monto
       FROM pagos p
       JOIN socios s ON s.numero_socio = p.socio_id
       ORDER BY p.fecha_pago DESC`
    );
    res.json(resultado.rows);
  } catch (err) {
    console.error('❌ Error al obtener pagos:', err);
    res.status(500).json({ error: 'Error al obtener pagos' });
  }
});

// 👉 Eliminar pago
router.delete('/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await db.query('DELETE FROM pagos WHERE id = $1', [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Pago no encontrado' });
    }
    res.json({ mensaje: 'Pago eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar pago:', err);
    res.status(500).json({ error: 'Error al eliminar pago' });
  }
});

// 👉 Eliminar un mes abonado (pagos_mensuales)
router.delete('/mensuales/:id', verificarToken, async (req, res) => {
  const { id } = req.params;
  try {
    const resultado = await db.query('DELETE FROM pagos_mensuales WHERE id = $1', [id]);
    if (resultado.rowCount === 0) {
      return res.status(404).json({ error: 'Mes no encontrado' });
    }
    res.json({ mensaje: 'Mes eliminado correctamente' });
  } catch (err) {
    console.error('❌ Error al eliminar mes pagado:', err);
    res.status(500).json({ error: 'Error al eliminar mes pagado' });
  }
});

// 👉 Obtener pagos mensuales agrupados por socio
router.get('/mensuales', verificarToken, async (req, res) => {
  try {
    const resultado = await db.query(`
      SELECT pm.id, pm.socio_numero, s.nombre, s.apellido, s.dni,
             pm.anio, pm.mes, pm.fecha_pago, pm.monto
      FROM pagos_mensuales pm
      JOIN socios s ON pm.socio_numero = s.numero_socio
      ORDER BY pm.socio_numero, pm.anio, pm.mes
    `);

    const agrupados = {};

    resultado.rows.forEach(row => {
      const id = row.socio_numero;
      if (!agrupados[id]) {
        agrupados[id] = {
          numero: id,
          nombre: row.nombre,
          apellido: row.apellido,
          dni: row.dni,
          pagos: []
        };
      }

      agrupados[id].pagos.push({
        id: row.id,
        anio: row.anio,
        mes: row.mes.toString().padStart(2, '0'),
        fecha_pago: row.fecha_pago,
        monto: row.monto
      });
    });

    res.json(Object.values(agrupados));
  } catch (err) {
    console.error('❌ Error al obtener pagos mensuales agrupados:', err);
    res.status(500).json({ error: 'Error al obtener pagos mensuales' });
  }
});

module.exports = router;
	
