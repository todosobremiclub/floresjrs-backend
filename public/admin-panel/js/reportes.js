const token = localStorage.getItem('token');
if (!token) window.location.href = 'login.html';

function fetchConToken(url, opciones = {}) {
  opciones.headers = opciones.headers || {};
  opciones.headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, opciones);
}

const nombresMeses = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// ---------- Reporte 1: Por mes pagado ----------
let mesActual = new Date().getMonth(); // 0 = Enero
let anioActual = new Date().getFullYear();
let datosPorMes = [];

async function cargarReportePorMes() {
  try {
    const res = await fetchConToken('/reportes/recaudado-por-fecha');
    const data = await res.json();
    datosPorMes = data.meses;
    const totalAnual = data.totalAnual ?? 0;
    document.getElementById('totalAnual').textContent = `$ ${totalAnual.toLocaleString('es-AR')}`;
    actualizarMes();
  } catch (err) {
    console.error('❌ Error al cargar reporte por mes pagado:', err);
    alert('Error al obtener datos del reporte');
  }
}

function cambiarMes(direccion) {
  mesActual += direccion;
  if (mesActual < 0) {
    mesActual = 11;
    anioActual -= 1;
  } else if (mesActual > 11) {
    mesActual = 0;
    anioActual += 1;
  }
  actualizarMes();
}

function actualizarMes() {
  document.getElementById('mesActual').textContent = nombresMeses[mesActual];
  const mesBuscado = `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`;
  const fila = datosPorMes.find(f => f.mes === mesBuscado);
  const totalMes = fila?.total ?? 0;
  document.getElementById('recaudacionMes').textContent = `$ ${totalMes.toLocaleString('es-AR')}`;
}

// ---------- Reporte 2: Por fecha real de pago ----------
let mesActual2 = new Date().getMonth();
let anioActual2 = new Date().getFullYear();
let datosPorFechaPago = [];

async function cargarReportePorFechaPago() {
  try {
    const res = await fetchConToken('/reportes/recaudado-por-fecha-pago');
    const data = await res.json();
    datosPorFechaPago = data.meses;
    const totalAnual = data.totalAnual ?? 0;
    document.getElementById('totalAnual2').textContent = `$ ${totalAnual.toLocaleString('es-AR')}`;
    actualizarMes2();
  } catch (err) {
    console.error('❌ Error al cargar reporte por fecha de pago:', err);
    alert('Error al obtener datos del segundo reporte');
  }
}

function cambiarMes2(direccion) {
  mesActual2 += direccion;
  if (mesActual2 < 0) {
    mesActual2 = 11;
    anioActual2 -= 1;
  } else if (mesActual2 > 11) {
    mesActual2 = 0;
    anioActual2 += 1;
  }
  actualizarMes2();
}

function actualizarMes2() {
  document.getElementById('mesActual2').textContent = nombresMeses[mesActual2];
  const mesBuscado = `${anioActual2}-${String(mesActual2 + 1).padStart(2, '0')}`;
  const fila = datosPorFechaPago.find(f => f.mes === mesBuscado);
  const totalMes = fila?.total ?? 0;
  document.getElementById('recaudacionMes2').textContent = `$ ${totalMes.toLocaleString('es-AR')}`;
}

// ---------- Inicio ----------
document.addEventListener('DOMContentLoaded', async () => {
  await cargarReportePorMes();
  await cargarReportePorFechaPago();
});

// ---------- Exponer funciones al window (para botones) ----------
window.cambiarMes = cambiarMes;
window.cambiarMes2 = cambiarMes2;


