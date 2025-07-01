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

let mesActual = new Date().getMonth(); // 0-indexado (0 = enero)
let anioActual = new Date().getFullYear();

document.addEventListener('DOMContentLoaded', () => {
  actualizarMes();
});

function cambiarMes(direccion) {
  mesActual += direccion;
  if (mesActual < 0) {
    mesActual = 11;
    anioActual -= 1;
  }
  if (mesActual > 11) {
    mesActual = 0;
    anioActual += 1;
  }
  actualizarMes();
}

async function actualizarMes() {
  document.getElementById('mesActual').textContent = nombresMeses[mesActual];

  try {
    const res = await fetchConToken(`/reportes/recaudacion-mensual?anio=${anioActual}&mes=${mesActual + 1}`);
    const data = await res.json();

    const totalMes = data.total ?? 0;
    const totalAnual = data.totalAnual ?? 0;

    document.getElementById('recaudacionMes').textContent = `$ ${totalMes.toLocaleString('es-AR')}`;
    document.getElementById('totalAnual').textContent = `$ ${totalAnual.toLocaleString('es-AR')}`;
  } catch (err) {
    document.getElementById('recaudacionMes').textContent = 'Error';
    document.getElementById('totalAnual').textContent = 'Error';
    console.error('❌ Error al obtener recaudación mensual:', err);
  }
}

window.cambiarMes = cambiarMes;
window.actualizarMes = actualizarMes;

