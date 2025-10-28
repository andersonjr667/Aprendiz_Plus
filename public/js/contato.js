// contato.js
document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('contactForm');
  if(!form) return;
  form.addEventListener('submit',async function(e){
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.target).entries());
    const res = await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const d = await res.json();
    if(res.ok) alert('Mensagem enviada'); else alert(d.error||'Erro');
  });
});
