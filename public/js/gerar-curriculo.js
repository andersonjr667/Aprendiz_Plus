// Script para página de geração de currículo
// Verifica se o perfil está 100% completo e habilita os botões

document.addEventListener('DOMContentLoaded', async function() {
    const statusDiv = document.getElementById('profile-status');
    const actionsDiv = document.getElementById('resume-actions');
    const messageDiv = document.getElementById('resume-message');

    // Simulação: buscar status do perfil do usuário autenticado
    // Troque por chamada real à API/backend
    const response = await fetch('/api/profile/completeness', { credentials: 'include' });
    const data = await response.json();

    if (data.completeness === 100) {
        statusDiv.textContent = 'Seu perfil está 100% completo!';
        actionsDiv.style.display = 'block';
    } else {
        statusDiv.textContent = `Complete seu perfil para gerar o currículo. Status: ${data.completeness}%`;
        actionsDiv.style.display = 'none';
    }

    document.getElementById('download-pdf').onclick = async function() {
        window.open('/api/resume/pdf', '_blank');
    };
    document.getElementById('download-docx').onclick = async function() {
        window.open('/api/resume/docx', '_blank');
    };
});
