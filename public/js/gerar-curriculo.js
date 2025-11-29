// Script para página de geração de currículo
// Verifica se o perfil está 100% completo e habilita os botões

document.addEventListener('DOMContentLoaded', async function() {
    const statusEl = document.getElementById('profile-status');
    const actionsEl = document.getElementById('resume-actions');
    const messageEl = document.getElementById('resume-message');
    const previewWrapper = document.getElementById('resume-preview-wrapper');
    const previewEl = document.getElementById('resume-preview');

    function makeText(tag, text, className) {
        const el = document.createElement(tag);
        if (className) el.className = className;
        el.textContent = text || '';
        return el;
    }

    function renderPreview(profile) {
        previewEl.innerHTML = '';
        const left = document.createElement('div');
        left.className = 'rp-left';
        const right = document.createElement('div');
        right.className = 'rp-right';

        // Photo, name, title
        const photoWrap = document.createElement('div');
        photoWrap.className = 'rp-photo-wrap';
        const img = document.createElement('img');
        img.className = 'rp-photo';
        img.alt = profile.name || 'Foto do candidato';
        img.src = profile.photo || '/images/logo.png';
        photoWrap.appendChild(img);
        left.appendChild(photoWrap);

        const name = makeText('h2', profile.name || profile.username || 'Nome do Candidato', 'rp-name');
        left.appendChild(name);
        if (profile.jobTitle) left.appendChild(makeText('div', profile.jobTitle, 'rp-jobtitle'));
        if (profile.location) left.appendChild(makeText('div', profile.location, 'rp-location'));

        // Summary / about
        if (profile.summary) {
            right.appendChild(makeText('h3', 'Resumo', 'rp-section-title'));
            right.appendChild(makeText('p', profile.summary, 'rp-summary'));
        }

        // Experience (take up to 3)
        if (Array.isArray(profile.experience) && profile.experience.length) {
            right.appendChild(makeText('h3', 'Experiência', 'rp-section-title'));
            const ul = document.createElement('div');
            ul.className = 'rp-list';
            profile.experience.slice(0,3).forEach(exp => {
                const item = document.createElement('div');
                item.className = 'rp-item';
                item.appendChild(makeText('div', exp.title || exp.role || '', 'rp-item-title'));
                item.appendChild(makeText('div', `${exp.company || ''} ${exp.period ? ' • ' + exp.period : ''}`, 'rp-item-meta'));
                if (exp.summary) item.appendChild(makeText('div', exp.summary, 'rp-item-desc'));
                ul.appendChild(item);
            });
            right.appendChild(ul);
        }

        // Skills
        if (Array.isArray(profile.skills) && profile.skills.length) {
            left.appendChild(makeText('h4', 'Competências', 'rp-section-title small'));
            const skillsWrap = document.createElement('div');
            skillsWrap.className = 'rp-skills';
            profile.skills.slice(0,12).forEach(s => {
                const chip = document.createElement('span');
                chip.className = 'rp-skill';
                chip.textContent = s;
                skillsWrap.appendChild(chip);
            });
            left.appendChild(skillsWrap);
        }

        // Interests / tags
        if (Array.isArray(profile.interests) && profile.interests.length) {
            left.appendChild(makeText('h4', 'Interesses', 'rp-section-title small'));
            const tags = document.createElement('div');
            tags.className = 'rp-tags';
            profile.interests.slice(0,10).forEach(t => {
                const tag = document.createElement('span');
                tag.className = 'rp-tag';
                tag.textContent = t;
                tags.appendChild(tag);
            });
            left.appendChild(tags);
        }

        // Education
        if (Array.isArray(profile.education) && profile.education.length) {
            right.appendChild(makeText('h3', 'Formação', 'rp-section-title'));
            const ul = document.createElement('div');
            ul.className = 'rp-list';
            profile.education.slice(0,3).forEach(ed => {
                const item = document.createElement('div');
                item.className = 'rp-item';
                item.appendChild(makeText('div', ed.degree || ed.course || '', 'rp-item-title'));
                item.appendChild(makeText('div', `${ed.institution || ''} ${ed.year ? ' • ' + ed.year : ''}`, 'rp-item-meta'));
                ul.appendChild(item);
            });
            right.appendChild(ul);
        }

        const container = document.createElement('div');
        container.className = 'rp-container';
        container.appendChild(left);
        container.appendChild(right);
        previewEl.appendChild(container);
    }

    async function fetchProfile() {
        // Prefer window.Auth.getCurrentUser (auth helper). Fall back to server endpoints.
        try {
            if (window.Auth && typeof window.Auth.getCurrentUser === 'function') {
                return await window.Auth.getCurrentUser();
            }

            // Try common endpoint used across the app
            let resp = await fetch('/api/users/me', { credentials: 'include' });
            if (resp.ok) return await resp.json();

            // Older/alternate endpoints (kept for backward-compatibility)
            resp = await fetch('/api/profile/me', { credentials: 'include' });
            if (resp.ok) return await resp.json();

            resp = await fetch('/api/profile', { credentials: 'include' });
            if (resp.ok) return await resp.json();

            throw new Error('profile fetch failed');
        } catch (e) {
            console.warn('Could not get profile via helper or endpoints', e);
            return null;
        }
    }

    try {
        const resp = await fetch('/api/profile/completeness');
        const data = await resp.json();
        if (data && data.completeness >= 50) {
            statusEl.textContent = `Seu perfil está ${data.completeness}% completo.`;
            actionsEl.style.display = '';
            document.getElementById('download-pdf').addEventListener('click', async () => {
                await handleDownload('pdf');
            });
            document.getElementById('download-docx').addEventListener('click', async () => {
                await handleDownload('docx');
            });

            // fetch profile and render preview
            const profile = await fetchProfile();
            if (profile) {
                renderPreview(profile);
                previewWrapper.style.display = '';
            }
        } else {
            statusEl.textContent = 'Complete mais informações no perfil para uma pré-visualização completa.';
            messageEl.textContent = 'Adicione experiência, formação e competências no seu perfil para que o currículo fique completo.';
            // still try to show a partial preview
            const profile = await fetchProfile();
            if (profile) {
                renderPreview(profile);
                previewWrapper.style.display = '';
            }
        }
    } catch (err) {
        console.error(err);
        statusEl.textContent = 'Erro ao verificar o status do perfil.';
        messageEl.textContent = '';
    }
});

// Download helper: open existing uploaded resume or fallback to server export endpoints
async function handleDownload(format = 'pdf') {
    const messageEl = document.getElementById('resume-message');
    try {
        // Check if user has an uploaded resume
        const me = await fetch('/api/users/me/resume', { credentials: 'include' });
        if (me.ok) {
            const json = await me.json();
            if (json && json.resumeUrl) {
                // resumeUrl points to /api/resumes/:id or external URL
                window.open(json.resumeUrl, '_blank');
                return;
            }
        }

        // Try legacy or server-side export endpoint
        const exportUrl = `/api/resume/${format}`; // e.g. /api/resume/pdf or /api/resume/docx
        // First try a HEAD to check existence
        let head;
        try { head = await fetch(exportUrl, { method: 'HEAD', credentials: 'include' }); } catch(e) { head = { ok: false }; }
        if (head && head.ok) {
            window.open(exportUrl, '_blank');
            return;
        }

        // As last resort, try GET (some servers may not respond to HEAD)
        let getResp;
        try { getResp = await fetch(exportUrl, { credentials: 'include' }); } catch(e) { getResp = { ok: false }; }
        if (getResp && getResp.ok) {
            window.open(exportUrl, '_blank');
            return;
        }

        // Nothing available on server: use client-side fallback
        const previewEl = document.getElementById('resume-preview');
        if (format === 'pdf' && previewEl) {
            if (typeof html2pdf !== 'undefined') {
                try {
                    const opt = {
                        margin:       0.5,
                        filename:     'curriculo.pdf',
                        image:        { type: 'jpeg', quality: 0.98 },
                        html2canvas:  { scale: 2, useCORS: true },
                        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
                    };
                    await html2pdf().set(opt).from(previewEl).save();
                    return;
                } catch (errPdf) {
                    console.error('html2pdf error', errPdf);
                }
            } else {
                // CSP or missing html2pdf: open printable window so user can save as PDF
                try {
                    const printWin = window.open('', '_blank');
                    const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Currículo - Pré-visualização</title><link rel="stylesheet" href="/public/css/gerar-curriculo.css"><style>body{padding:20px;font-family:Arial,Helvetica,sans-serif;}</style></head><body>${previewEl.innerHTML}</body></html>`;
                    printWin.document.open();
                    printWin.document.write(doc);
                    printWin.document.close();
                    printWin.focus();
                    printWin.print();
                    return;
                } catch (errPrint) {
                    console.error('print fallback error', errPrint);
                }
            }
        }

        if ((format === 'docx' || format === 'doc') && previewEl) {
            // Simple HTML -> Word fallback (saves as .doc which Word opens)
            try {
                const header = "\uFEFF" + '<html><head><meta charset="utf-8"></head><body>';
                const footer = '</body></html>';
                const content = header + previewEl.innerHTML + footer;
                const blob = new Blob([content], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'curriculo.doc';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
                return;
            } catch (errDoc) {
                console.error('doc fallback error', errDoc);
            }
        }

        // Nothing available
        messageEl.textContent = 'Nenhum currículo disponível para download. Faça upload do seu currículo em "Perfil" ou aguarde suporte à exportação.';
    } catch (e) {
        console.error('Erro no download do currículo', e);
        const messageEl2 = document.getElementById('resume-message');
        if (messageEl2) messageEl2.textContent = 'Erro ao preparar o download. Verifique a conexão e tente novamente.';
    }
}
