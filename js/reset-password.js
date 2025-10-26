document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('resetForm');
  if (!form) return;

  // Pre-fill token and email from query string if present
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const emailParam = params.get('email');
  if (token) document.getElementById('token').value = token;
  if (emailParam) document.getElementById('email').value = decodeURIComponent(emailParam);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const token = document.getElementById('token').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
      Toast.error('As senhas não coincidem');
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, token, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        Toast.success(data.message || 'Senha redefinida com sucesso');
        setTimeout(() => { window.location.href = '/login'; }, 1200);
      } else {
        Toast.error(data.error || 'Erro ao redefinir senha');
      }
    } catch (err) {
      console.error('reset-password submit error:', err);
      Toast.error('Erro ao conectar com o servidor');
    }
  });
});
