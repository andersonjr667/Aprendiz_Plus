// publish-job.js (simple multi-step helper and submit)
function next(step){ document.querySelectorAll('.step').forEach(s=>s.style.display='none'); const el=document.getElementById(step); if(el) el.style.display='block'; }
async function submitForm(e){ 
  e.preventDefault(); 
  const data = Object.fromEntries(new FormData(e.target)); 
  await fetch('/api/jobs',{method:'POST',body:JSON.stringify(data)}); 
  if (window.UI && window.UI.toast) {
    window.UI.toast('Vaga enviada (se estiver autenticado como empresa)', 'success');
  } else {
    alert('Vaga enviada (se estiver autenticado como empresa)');
  }
}

// expose globals used by HTML
window.next = next;
window.submitForm = submitForm;
