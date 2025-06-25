document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('token');
  if (!token) return (window.location.href = 'login.html');

  const headers = { Authorization: token };
  const recaudacionEl = document.getElementById('recaudacionMes');
  const mesEl = document.getElementById('mesActual');

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  let mesActual = new Date().getMonth(); // 0 = Enero

  const actualizarRecaudacion = async () => {
    try {
      const res = await fetch(`/reportes/recaudacion-mensual?mes=${mesActual + 1}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al obtener recaudación');

      recaudacionEl.textContent = `$ ${data.total.toLocaleString('es-AR')}`;
      mesEl.textContent = meses[mesActual];
    } catch (err) {
      console.error('❌ Error recaudación:', err);
      recaudacionEl.textContent = '—';
    }
  };

  window.cambiarMes = (delta) => {
    mesActual += delta;
    if (mesActual < 0) mesActual = 0;
    if (mesActual > 11) mesActual = 11;
    actualizarRecaudacion();
  };

  // Primer carga
  actualizarRecaudacion();
});


