// publish-job.js (simple multi-step helper and submit)
function next(step){ document.querySelectorAll('.step').forEach(s=>s.style.display='none'); const el=document.getElementById(step); if(el) el.style.display='block'; }
async function submitForm(e){ e.preventDefault(); const data = Object.fromEntries(new FormData(e.target)); await fetch('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}); alert('Vaga enviada (se estiver autenticado como empresa)'); }

// expose globals used by HTML
window.next = next;
window.submitForm = submitForm;
