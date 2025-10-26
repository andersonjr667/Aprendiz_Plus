document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('forgotForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        Toast.success(data.message || 'Se o email estiver cadastrado, você receberá instruções.');
      } else {
        Toast.error(data.error || 'Erro ao solicitar reset');
      }
    } catch (err) {
      console.error('forgot-password submit error:', err);
      Toast.error('Erro ao conectar com o servidor');
    }
  });
});
