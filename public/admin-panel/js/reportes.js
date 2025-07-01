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

let mesActual = new Date().getMonth(); // 0 = Enero
let anioActual = new Date().getFullYear();
let datosPorMes = [];

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetchConToken('/reportes/recaudado-por-fecha');
    const data = await res.json();
    datosPorMes = data.meses;

    const totalAnual = data.totalAnual ?? 0;
    document.getElementById('totalAnual').textContent = `$ ${totalAnual.toLocaleString('es-AR')}`;

    actualizarMes();
  } catch (err) {
    console.error('❌ Error al cargar datos:', err);
    alert('Error al obtener datos de reportes');
  }
});

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

window.cambiarMes = cambiarMes;
window.actualizarMes = actualizarMes;


