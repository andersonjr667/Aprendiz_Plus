const fs = require('fs');
const path = require('path');

const pagesDir = path.join(__dirname, '../pages');

// String do favicon a ser inserida
const faviconLink = '    <link rel="icon" type="image/x-icon" href="../images/favicon.ico">';

function addFavicon(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    const fileName = path.basename(filePath);

    // Verifica se já tem favicon
    if (content.includes('favicon.ico')) {
        console.log(`${fileName} já tem favicon`);
        return;
    }

    // Adiciona o favicon após a meta viewport
    content = content.replace(
        /<meta name="viewport"[^>]*>/,
        '$&\n' + faviconLink
    );

    // Se não encontrou meta viewport, adiciona após o título
    if (!content.includes(faviconLink)) {
        content = content.replace(
            /<\/title>/,
            '$&\n' + faviconLink
        );
    }

    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Adicionado favicon em ${fileName}`);
}

// Processa todos os arquivos HTML
fs.readdirSync(pagesDir)
    .filter(file => file.endsWith('.html'))
    .forEach(file => {
        const filePath = path.join(pagesDir, file);
        addFavicon(filePath);
    });

console.log('\nProcessamento concluído!');