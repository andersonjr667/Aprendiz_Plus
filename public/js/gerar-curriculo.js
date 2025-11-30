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

    function normalizeProfile(profile) {
        if (!profile) return {};

        // Merge candidateProfile subdocument (if exists) into top-level normalized fields
        const cp = profile.candidateProfile || {};

        const normalized = {
            name: profile.name || profile.fullName || profile.username || '',
            phone: profile.phone || cp.whatsapp || '',
            email: profile.email || '',
            city: (cp.city || profile.city || profile.location || '').split(',')[0] || '',
            state: (cp.state || profile.state || '').trim() || '',
            linkedin: cp.linkedinUrl || profile.linkedinUrl || profile.linkedin || '',
            portfolio: cp.portfolioUrl || profile.portfolioUrl || profile.website || '',
            objective: profile.objective || profile.jobObjective || cp.objective || '',
            summary: profile.bio || cp.bio || profile.summary || '',
            // skills may be an array or comma-separated string
            skills: Array.isArray(profile.skills) ? profile.skills.slice() : (typeof profile.skills === 'string' ? profile.skills.split(',') : []),
            softSkills: Array.isArray(profile.softSkills) ? profile.softSkills.slice() : [],
            interests: Array.isArray(profile.interests) ? profile.interests.slice() : (Array.isArray(cp.areasOfInterest) ? cp.areasOfInterest.slice() : []),
            experience: Array.isArray(profile.experience) ? profile.experience.slice() : (Array.isArray(cp.previousExperience) ? cp.previousExperience : []),
            education: Array.isArray(profile.education) ? profile.education.slice() : (cp.currentEducation ? [{ degree: cp.currentEducation, institution: cp.educationInstitution, year: cp.expectedGraduation ? new Date(cp.expectedGraduation).getFullYear() : cp.expectedGraduation }] : []),
            courses: Array.isArray(profile.courses) ? profile.courses.slice() : (Array.isArray(cp.extracurricularCourses) ? cp.extracurricularCourses.slice() : []),
            languages: Array.isArray(profile.languages) ? profile.languages.slice() : (profile.language ? [profile.language] : []),
            availability: profile.availability || cp.availability || '',
            certifications: Array.isArray(profile.certifications) ? profile.certifications.slice() : [],
            projects: Array.isArray(profile.projects) ? profile.projects.slice() : [],
            programs: Array.isArray(profile.programs) ? profile.programs.slice() : (cp.isInApprenticeshipProgram ? [cp.apprenticeshipProgramName || 'Programa de Aprendizagem'] : [])
        };

        // Trim strings and remove empty entries
        Object.keys(normalized).forEach(k => {
            if (typeof normalized[k] === 'string') normalized[k] = normalized[k].trim();
            if (Array.isArray(normalized[k])) normalized[k] = normalized[k].map(x => (x || '').toString().trim()).filter(Boolean);
        });

        // Separate hard vs soft skills if provided in a single array: try to detect common soft-skill words
        if (normalized.skills.length && normalized.softSkills.length === 0) {
            const softKeywords = ['comunicação','comunicacao','trabalho em equipe','organização','organizacao','liderança','lideranca','resolução','resolucao','resiliencia','proatividade','disciplina','pontualidade'];
            const hard = [];
            const soft = [];
            normalized.skills.forEach(s => {
                const low = s.toLowerCase();
                if (softKeywords.some(sk => low.includes(sk))) soft.push(s);
                else hard.push(s);
            });
            normalized.skills = hard;
            normalized.softSkills = soft;
        }

        // Sort skills alphabetically and limit length
        normalized.skills = normalized.skills.sort((a,b)=>a.localeCompare(b)).slice(0,40);
        normalized.softSkills = normalized.softSkills.sort((a,b)=>a.localeCompare(b)).slice(0,20);

        // Normalize experiences: ensure objects with start/end dates or year strings
        normalized.experience = (normalized.experience || []).map(exp => {
            if (typeof exp === 'string') return { title: exp };
            return exp;
        }).filter(Boolean);

        // Sort experiences newest first by 'endDate' or 'startDate' or year fields
        normalized.experience.sort((a,b)=>{
            const aDate = a.endDate ? new Date(a.endDate) : (a.startDate ? new Date(a.startDate) : (a.year ? new Date(a.year,0,1) : new Date(0)));
            const bDate = b.endDate ? new Date(b.endDate) : (b.startDate ? new Date(b.startDate) : (b.year ? new Date(b.year,0,1) : new Date(0)));
            return bDate - aDate;
        });

        // Format periods helper
        normalized.experience = normalized.experience.map(e => {
            const start = e.startDate ? formatPeriod(new Date(e.startDate)) : (e.startYear ? e.startYear.toString() : '');
            const end = e.endDate ? formatPeriod(new Date(e.endDate)) : (e.endYear ? e.endYear.toString() : (e.current || e.isCurrent ? 'Atual' : ''));
            const period = start || end ? [start, end].filter(Boolean).join(' – ') : (e.period || '');
            return Object.assign({}, e, { period });
        });

        return normalized;
    }

    function formatPeriod(d) {
        if (!d || !(d instanceof Date)) return '';
        const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        return `${months[d.getMonth()]}/${d.getFullYear()}`;
    }

    function renderPreview(profile) {
        previewEl.innerHTML = '';
        const data = normalizeProfile(profile);

        // Inject minimal styles for CV layout so preview and PDF look professional
        const styleId = 'cv-inline-styles';
        if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .cv-container{font-family: Inter, Roboto, Arial, sans-serif; color:#0f172a; font-size:11pt; max-width:800px}
                .cv-top{border-bottom:2px solid #e6eef7;padding-bottom:8px;margin-bottom:8px}
                .cv-name{font-size:18pt;margin:0 0 6px}
                .cv-contact{font-size:10pt;color:#334155}
                .cv-section{margin:10px 0}
                .cv-section-title{font-size:12pt;font-weight:700;margin:4px 0}
                .cv-subtitle{font-size:10.5pt;margin:6px 0 4px}
                .cv-summary{margin:6px 0;line-height:1.35}
                .cv-skills{display:flex;flex-wrap:wrap;gap:6px}
                .cv-skill{background:#eef6ff;padding:6px 8px;border-radius:999px;font-size:9.5pt}
                .cv-item{margin:6px 0}
                .cv-item-title{font-weight:600}
                .cv-item-meta{color:#475569;font-size:9.5pt}
                ul{margin:6px 0 6px 18px}
            `;
            document.head.appendChild(style);
        }

        const container = document.createElement('div');
        container.className = 'cv-container';

        // Top: personal info (no photo)
        const top = document.createElement('div');
        top.className = 'cv-top';
        const nameEl = makeText('h1', data.name || 'Nome Completo', 'cv-name');
        top.appendChild(nameEl);

        const contactLine = [];
            // Build contact row with simple SVG icons
            const contactRow = document.createElement('div');
            contactRow.className = 'cv-contact';

            function makeIcon(svgPath) {
                const span = document.createElement('span');
                span.className = 'cv-icon';
                span.innerHTML = svgPath;
                return span;
            }

            const items = [];
            if (data.email) items.push({ icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 6.5L12 13L21 6.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/></svg>', text: data.email, href: 'mailto:' + data.email });
            if (data.phone) items.push({ icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M22 16.92V20a2 2 0 0 1-2.18 2A19.79 19.79 0 0 1 3 5.18 2 2 0 0 1 5 3h3.09a1 1 0 0 1 1 .75c.12.86.37 1.7.73 2.5a1 1 0 0 1-.24 1L8.91 9.91a16 16 0 0 0 6.18 6.18l1.66-1.66a1 1 0 0 1 1-.24c.8.36 1.64.61 2.5.73a1 1 0 0 1 .75 1V20z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>', text: data.phone, href: 'tel:' + data.phone });
            const locationText = [data.city, data.state].filter(Boolean).join(' / ');
            if (locationText) items.push({ icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 10c0 6-9 12-9 12S3 16 3 10a9 9 0 1 1 18 0z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10" r="2" stroke="currentColor" stroke-width="1.2"/></svg>', text: locationText });
            if (data.linkedin) items.push({ icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 8a6 6 0 0 1 6 6v6h-4v-6a2 2 0 0 0-4 0v6h-4v-12h4v2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="3" width="4" height="12" rx="1" stroke="currentColor" stroke-width="1.2"/><circle cx="4" cy="6" r="1" fill="currentColor"/></svg>', text: 'LinkedIn', href: data.linkedin });
            if (data.portfolio) items.push({ icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 14l11-11" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 21H3V3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>', text: 'Portfólio', href: data.portfolio });

            items.forEach(it => {
                const wrap = document.createElement('div'); wrap.className = 'cv-contact-item';
                const ic = makeIcon(it.icon); ic.classList.add('cv-contact-icon');
                wrap.appendChild(ic);
                const txt = document.createElement('div'); txt.className = 'cv-contact-text';
                if (it.href) {
                    const a = document.createElement('a'); a.href = it.href; a.target = '_blank'; a.rel = 'noopener'; a.textContent = it.text; txt.appendChild(a);
                } else {
                    txt.textContent = it.text;
                }
                                const doc = `<!doctype html><html><head><meta charset="utf-8"><title>Currículo - Pré-visualização</title><link rel="stylesheet" href="/css/gerar-curriculo.css"><style>body{padding:20px;font-family:Arial,Helvetica,sans-serif;}</style></head><body>${previewEl.innerHTML}</body></html>`;
                contactRow.appendChild(wrap);
            });

            if (items.length) top.appendChild(contactRow);

        container.appendChild(top);

        // Objective
        if (data.objective) {
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Objetivo', 'cv-section-title'));
            sec.appendChild(makeText('p', data.objective, 'cv-objective'));
            container.appendChild(sec);
        }

        // Summary (3-4 lines)
        if (data.summary) {
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Resumo', 'cv-section-title'));
            const p = makeText('p', data.summary, 'cv-summary');
            sec.appendChild(p);
            container.appendChild(sec);
        }

        // Skills: hard and soft
        if ((data.skills && data.skills.length) || (data.softSkills && data.softSkills.length)) {
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Habilidades', 'cv-section-title'));
            if (data.skills && data.skills.length) {
                sec.appendChild(makeText('h3', 'Técnicas', 'cv-subtitle'));
                const ul = document.createElement('div'); ul.className = 'cv-skills';
                data.skills.forEach(s => { const sp = makeText('span', s, 'cv-skill'); ul.appendChild(sp); });
                sec.appendChild(ul);
            }
            if (data.softSkills && data.softSkills.length) {
                sec.appendChild(makeText('h3', 'Comportamentais', 'cv-subtitle'));
                const ul2 = document.createElement('div'); ul2.className = 'cv-skills';
                data.softSkills.forEach(s => { const sp = makeText('span', s, 'cv-skill soft'); ul2.appendChild(sp); });
                sec.appendChild(ul2);
            }
            container.appendChild(sec);
        }

        // Experience (only include experiences that have a description/summary)
        const experiencesToShow = (data.experience || []).filter(exp => {
            if (!exp) return false;
            if (Array.isArray(exp.summary)) return exp.summary.length > 0;
            return String(exp.summary || '').trim().length > 0;
        });

        if (experiencesToShow && experiencesToShow.length) {
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Experiência', 'cv-section-title'));
            experiencesToShow.forEach(exp => {
                const item = document.createElement('div'); item.className = 'cv-item';
                const title = makeText('div', `${exp.title || exp.role || ''} ${exp.company ? '– ' + exp.company : ''}`, 'cv-item-title');
                item.appendChild(title);
                if (exp.period) item.appendChild(makeText('div', exp.period, 'cv-item-meta'));
                if (exp.summary) {
                    const ul = document.createElement('ul');
                    (Array.isArray(exp.summary) ? exp.summary : String(exp.summary).split('\n')).slice(0,5).forEach(line => {
                        if (!line) return; const li = document.createElement('li'); li.textContent = line.trim(); ul.appendChild(li);
                    });
                    item.appendChild(ul);
                }
                container.appendChild(item);
            });
        } else {
            // No experiences
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Experiência', 'cv-section-title'));
            sec.appendChild(makeText('div', 'Sem experiências registradas', 'cv-empty-note'));
            container.appendChild(sec);
        }

        // Education
        if (data.education && data.education.length) {
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Formação', 'cv-section-title'));
            data.education.forEach(ed => {
                const item = document.createElement('div'); item.className = 'cv-item';
                const deg = ed.degree || ed.course || ed.name || '';
                item.appendChild(makeText('div', deg + (ed.institution ? ' – ' + ed.institution : ''), 'cv-item-title'));
                if (ed.year) item.appendChild(makeText('div', ed.year, 'cv-item-meta'));
                container.appendChild(item);
            });
        }

        // Courses
        if (data.courses && data.courses.length) {
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Cursos', 'cv-section-title'));
            const ul = document.createElement('ul');
            data.courses.forEach(c => { const li = document.createElement('li'); li.textContent = c; ul.appendChild(li); });
            sec.appendChild(ul);
            container.appendChild(sec);
        }

        // Additional info
        const extras = [];
        if (data.languages && data.languages.length) extras.push('Idiomas: ' + data.languages.join(', '));
        if (data.availability) extras.push('Disponibilidade: ' + data.availability);
        if (data.certifications && data.certifications.length) extras.push('Certificações: ' + data.certifications.join(', '));
        if (data.programs && data.programs.length) extras.push('Programas: ' + data.programs.join(', '));
        if (data.projects && data.projects.length) extras.push('Projetos: ' + data.projects.map(p => p.title || p).slice(0,5).join(', '));
        if (extras.length) {
            const sec = document.createElement('div'); sec.className = 'cv-section';
            sec.appendChild(makeText('h2', 'Informações adicionais', 'cv-section-title'));
            extras.forEach(e => sec.appendChild(makeText('div', e, 'cv-extra')));
            container.appendChild(sec);
        }

        // Append to preview
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
                    // Use profile name for filename if available
                    let safeName = 'Curriculo';
                    try {
                        const pr = await fetch('/api/users/me', { credentials: 'include' });
                        if (pr.ok) {
                            const pj = await pr.json();
                            const rawName = pj && (pj.name || pj.fullName) ? (pj.name || pj.fullName) : '';
                            if (rawName) safeName = rawName.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
                        }
                    } catch (e) { /* ignore */ }
                    const filename = `Curriculo-${safeName}.pdf`;
                    const opt = {
                        margin:       0.5,
                        filename:     filename,
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
                let safeBase = 'Curriculo';
                try {
                    const pr = await fetch('/api/users/me', { credentials: 'include' });
                    if (pr.ok) {
                        const pj = await pr.json();
                        const rawName = pj && (pj.name || pj.fullName) ? (pj.name || pj.fullName) : '';
                        if (rawName) safeBase = rawName.replace(/[^a-zA-Z0-9\s\-_]/g, '').replace(/\s+/g, '_');
                    }
                } catch (e) { /* ignore */ }
                const a = document.createElement('a');
                a.href = url;
                a.download = `${'Curriculo-' + safeBase}.doc`;
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
