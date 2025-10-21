const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../pages');

// Header padrão para todas as páginas (exceto admin)
const standardHeader = `    <header class="header">
        <nav class="nav-bar">
            <div class="logo">
                <a href="/">
                    <img src="/images/logo.png" alt="Aprendiz+" class="logo-img">
                </a>
            </div>
            <ul class="nav-menu">
                <li><a href="/">Início</a></li>
                <li><a href="/vagas">Vagas</a></li>
                <li><a href="/empresas">Para Empresas</a></li>
                <li><a href="/candidatos">Para Candidatos</a></li>
                <li><a href="/noticias">Notícias</a></li>
                <li class="auth-buttons">
                    <a href="/login" class="btn-login">Fazer Login</a>
                    <a href="/cadastro" class="btn-cadastro">Cadastre-se</a>
                </li>
            </ul>
        </nav>
    </header>`;

// Header para páginas administrativas
const adminHeader = `    <header class="header">
        <nav class="nav-bar">
            <div class="logo">
                <a href="/admin">
                    <img src="/images/logo.png" alt="Aprendiz+" class="logo-img">
                </a>
            </div>
            <ul class="nav-menu">
                <li><a href="/admin">Dashboard</a></li>
                <li><a href="/admin/usuarios">Usuários</a></li>
                <li><a href="/admin/vagas">Vagas</a></li>
                <li><a href="/admin/empresas">Empresas</a></li>
                <li><a href="/admin/noticias">Notícias</a></li>
                <li><a href="/admin/logs">Logs</a></li>
            </ul>
        </nav>
    </header>`;

function updateFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    // Substituir o header antigo
    const headerRegex = /<header[\s\S]*?<\/header>/;
    const newHeader = fileName.startsWith('admin') ? adminHeader : standardHeader;
    content = content.replace(headerRegex, newHeader);

    // Corrigir links removendo .html
    content = content.replace(/href="([^"]+)\.html"/g, 'href="$1"');

    // Garantir que os arquivos CSS e JS necessários estejam incluídos
    const requiredCssLinks = `    <link rel="stylesheet" href="/css/variables.css">
    <link rel="stylesheet" href="/css/style.css">
    <link rel="stylesheet" href="/css/components.css">
    <link rel="stylesheet" href="/css/logo.css">
    <link rel="stylesheet" href="/css/mobile-menu.css">
    <link rel="stylesheet" href="/css/responsive.css">
    <link rel="stylesheet" href="/css/auth-buttons.css">`;

    // Remover links CSS duplicados
    const cssRegex = /<link rel="stylesheet"[\s\S]*?>/g;
    const existingCssLinks = content.match(cssRegex) || [];
    const uniqueCssLinks = [...new Set(existingCssLinks)];
    content = content.replace(/<link rel="stylesheet"[\s\S]*?>(\s*<link rel="stylesheet"[\s\S]*?>)*/, requiredCssLinks);

    // Garantir que os scripts necessários estejam incluídos no final do body
    const requiredScripts = `    <script src="/js/main.js"></script>
    <script src="/js/img-fallbacks.js"></script>
    <script src="/js/session-ui.js"></script>
    <script src="/js/mobile-menu.js"></script>`;

    // Remover scripts duplicados
    const scriptRegex = /<script src="\/js\/.*?><\/script>/g;
    content = content.replace(/<script src="\/js\/.*?><\/script>\s*(<script src="\/js\/.*?><\/script>\s*)*/g, requiredScripts);

    // Adicionar viewport meta tag se não existir
    if (!content.includes('<meta name="viewport"')) {
        content = content.replace('<head>', `<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">`);
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${fileName}`);
}

// Processar todos os arquivos HTML
fs.readdirSync(pagesDir)
    .filter(file => file.endsWith('.html'))
    .forEach(file => {
        const filePath = path.join(pagesDir, file);
        updateFile(filePath);
    });

console.log('All files have been updated!');