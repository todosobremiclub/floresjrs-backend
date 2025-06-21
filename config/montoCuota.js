// config/montoCuota.js
let montoActual = 5000; // valor por defecto

module.exports = {
  getMonto: () => montoActual,
  setMonto: (nuevoMonto) => { montoActual = nuevoMonto; }
};
