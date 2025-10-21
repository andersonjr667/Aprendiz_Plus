const fs = require('fs');
const path = require('path');

// Diretório onde estão os arquivos HTML
const pagesDir = path.join(__dirname, '../pages');

// Função para adicionar os arquivos CSS e JS responsivos
function addResponsiveFiles(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Adiciona os arquivos CSS responsivos
    content = content.replace(
        /<link rel="stylesheet" href="\/css\/logo\.css">/,
        `<link rel="stylesheet" href="/css/logo.css">
    <link rel="stylesheet" href="/css/mobile-menu.css">
    <link rel="stylesheet" href="/css/responsive.css">
    <link rel="stylesheet" href="/css/auth-buttons.css">`
    );

    // Adiciona o arquivo JS do menu mobile
    content = content.replace(
        /<\/body>/,
        `    <script src="/js/mobile-menu.js"></script>
</body>`
    );

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${path.basename(filePath)}`);
}

// Lê todos os arquivos HTML do diretório
fs.readdirSync(pagesDir)
    .filter(file => file.endsWith('.html'))
    .forEach(file => {
        const filePath = path.join(pagesDir, file);
        addResponsiveFiles(filePath);
    });

console.log('All HTML files have been updated successfully!');