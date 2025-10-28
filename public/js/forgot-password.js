// forgot-password.js — moved from inline script
document.addEventListener('DOMContentLoaded', function(){
  const form = document.getElementById('forgotForm');
  if(!form) return;
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    const msg = document.getElementById('msg');
    if(msg) msg.style.display = 'none';
    const email = document.getElementById('email').value;
    try{
      const res = await fetch('/api/auth/forgot', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});
      const data = await res.json();
      if(res.ok){ if(msg){ msg.style.display='block'; msg.style.background='#e6ffed'; msg.style.color='#006b3b'; msg.textContent = data.message || 'Link de recuperação enviado, verifique seu e-mail.'; } }
      else throw new Error(data.error || 'Erro ao enviar');
    }catch(err){ if(msg){ msg.style.display='block'; msg.style.background='#fff5f5'; msg.style.color='#c00'; msg.textContent = err.message; } }
  });
});
