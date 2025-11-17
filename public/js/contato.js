// contato.js
document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    const res = await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const d = await res.json();
    if(res.ok) {
      if (window.UI && window.UI.toast) {
        window.UI.toast('Mensagem enviada com sucesso!', 'success');
      } else {
        alert('Mensagem enviada');
      }
    } else {
      if (window.UI && window.UI.toast) {
        window.UI.toast(d.error || 'Erro ao enviar mensagem', 'error');
      } else {
        alert(d.error||'Erro');
      }
    }
  });
});
