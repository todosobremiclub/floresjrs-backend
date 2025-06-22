const db = require('./db');

async function getMonto() {
  try {
    const res = await db.query(`SELECT valor FROM configuracion WHERE clave = 'monto_cuota'`);
    return parseInt(res.rows[0]?.valor) || 0;
  } catch (err) {
    console.error('Error al obtener monto de cuota:', err);
    return 0;
  }
}

async function setMonto(nuevoMonto) {
  try {
    await db.query(`
      INSERT INTO configuracion (clave, valor)
      VALUES ('monto_cuota', $1)
      ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor
    `, [nuevoMonto.toString()]);
  } catch (err) {
    console.error('Error al actualizar monto de cuota:', err);
  }
}

module.exports = { getMonto, setMonto };
