// reset-password.js — moved from inline script
function getQuery(){ return new URLSearchParams(window.location.search); }

document.addEventListener('DOMContentLoaded', function(){
  const token = getQuery().get('token') || '';
  const form = document.getElementById('resetForm');
  const msg = document.getElementById('msg');
  if (!form) return;
  form.addEventListener('submit', async function(e){
    e.preventDefault();
    if(msg) { msg.style.display='none'; }
    const password = document.getElementById('password').value;
    const confirm = document.getElementById('confirm').value;
    if(password !== confirm){
      if(msg){ msg.style.display='block'; msg.style.background='#fff5f5'; msg.style.color='#c00'; msg.textContent='As senhas não coincidem'; }
      return;
    }
    try{
      const res = await fetch('/api/auth/reset', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,password})});
      const data = await res.json();
      if(res.ok){ if(msg){ msg.style.display='block'; msg.style.background='#e6ffed'; msg.style.color='#006b3b'; msg.textContent = data.message || 'Senha redefinida. Faça login.'; } setTimeout(()=>location.href='/login',1500); }
      else throw new Error(data.error||'Erro ao redefinir');
    }catch(err){ if(msg){ msg.style.display='block'; msg.style.background='#fff5f5'; msg.style.color='#c00'; msg.textContent=err.message } }
  });
});
