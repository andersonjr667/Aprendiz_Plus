// publicar-vaga.js — multi-step publish job form
document.addEventListener('DOMContentLoaded', function(){
  const toStep2 = document.getElementById('toStep2');
  const toStep1 = document.getElementById('toStep1');
  const toStep3 = document.getElementById('toStep3');
  const toStep2b = document.getElementById('toStep2b');
  if(toStep2) toStep2.addEventListener('click',()=>{ document.getElementById('step1').style.display='none'; document.getElementById('step2').style.display='block';});
  if(toStep1) toStep1.addEventListener('click',()=>{ document.getElementById('step2').style.display='none'; document.getElementById('step1').style.display='block';});
  if(toStep3) toStep3.addEventListener('click',()=>{ document.getElementById('step2').style.display='none'; document.getElementById('step3').style.display='block'; const form=new FormData(document.getElementById('jobForm')); const review=document.getElementById('review'); if(review) review.innerHTML=`<p><strong>${form.get('title')}</strong></p><p>${form.get('requirements')}</p>`});
  if(toStep2b) toStep2b.addEventListener('click',()=>{ document.getElementById('step3').style.display='none'; document.getElementById('step2').style.display='block';});
  const jobForm = document.getElementById('jobForm');
  if(jobForm) jobForm.addEventListener('submit', async function(e){ e.preventDefault(); const form=new FormData(e.target); const payload = Object.fromEntries(form.entries()); const res=await fetch('/api/jobs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); const data=await res.json(); if(res.ok){ alert('Vaga publicada'); location.href='/empresa/profile'; } else { alert(data.error||'Erro ao publicar'); } });
});
