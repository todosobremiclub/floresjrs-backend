document.addEventListener('DOMContentLoaded', async () => {
  const token = localStorage.getItem('token');

  if (!token) {
    alert('No autorizado. Redirigiendo al login...');
    return (window.location.href = 'login.html');
  }

  const fetchConToken = async (endpoint) => {
    const res = await fetch(endpoint, {
      headers: { Authorization: token }
    });
    return res.json();
  };

  // 1. Al día vs en mora
  const estado = await fetchConToken('/reportes/estado-pago');
  new Chart(document.getElementById('graficoAlDia'), {
    type: 'doughnut',
    data: {
      labels: ['Al día', 'En mora'],
      datasets: [{
        data: [estado.alDia, estado.enMora],
        backgroundColor: ['#28a745', '#dc3545']
      }]
    }
  });

  // 2. Socios por categoría
  const categorias = await fetchConToken('/reportes/por-categoria');
  new Chart(document.getElementById('graficoCategorias'), {
    type: 'bar',
    data: {
      labels: categorias.map(c => c.categoria),
      datasets: [{
        label: 'Cantidad',
        data: categorias.map(c => c.count),
        backgroundColor: '#007bff'
      }]
    },
    options: { responsive: true }
  });

  // 3. Estado de pago por categoría
  const estadoPorCat = await fetchConToken('/reportes/estado-pago-por-categoria');
  new Chart(document.getElementById('graficoEstadoPorCategoria'), {
    type: 'bar',
    data: {
      labels: estadoPorCat.map(c => c.categoria),
      datasets: [
        {
          label: 'Al día',
          data: estadoPorCat.map(c => c.al_dia),
          backgroundColor: '#28a745'
        },
        {
          label: 'En mora',
          data: estadoPorCat.map(c => c.en_mora),
          backgroundColor: '#dc3545'
        }
      ]
    },
    options: {
      responsive: true,
      scales: {
        x: { stacked: true },
        y: { stacked: true }
      }
    }
  });

  // 4. Con y sin foto
  const foto = await fetchConToken('/reportes/con-foto');
  new Chart(document.getElementById('graficoFoto'), {
    type: 'pie',
    data: {
      labels: ['Con foto', 'Sin foto'],
      datasets: [{
        data: [foto.con_foto, foto.sin_foto],
        backgroundColor: ['#17a2b8', '#6c757d']
      }]
    }
  });

  // 5. Activos e inactivos
  const activos = await fetchConToken('/reportes/activos');
  new Chart(document.getElementById('graficoActivo'), {
    type: 'doughnut',
    data: {
      labels: ['Activos', 'Inactivos'],
      datasets: [{
        data: [activos.activos, activos.inactivos],
        backgroundColor: ['#ffc107', '#6c757d']
      }]
    }
  });
});
