document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) return (window.location.href = 'login.html');

  const recaudacionEl = document.getElementById('recaudacionMes');
  const mesEl = document.getElementById('mesActual');

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  let mesActual = new Date().getMonth(); // 0 = Enero

  // ✅ Función para enviar peticiones con token
  const fetchConToken = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    };

    return fetch(url, {
      ...options,
      headers
    });
  };

  // ✅ Recaudación mensual
  const actualizarRecaudacion = async () => {
    try {
      const res = await fetchConToken(`/reportes/recaudacion-mensual?mes=${mesActual + 1}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener recaudación');

      recaudacionEl.textContent = `$ ${data.total.toLocaleString('es-AR')}`;
      mesEl.textContent = meses[mesActual];
    } catch (err) {
      console.error('❌ Error recaudación:', err);
      recaudacionEl.textContent = '—';
    }
  };

  // ✅ Cambio de mes con flechas
  window.cambiarMes = (delta) => {
    mesActual += delta;
    if (mesActual < 0) mesActual = 0;
    if (mesActual > 11) mesActual = 11;
    actualizarRecaudacion();
  };

  // ✅ Primera carga
  actualizarRecaudacion();
});



