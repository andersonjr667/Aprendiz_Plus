const fs = require('fs');
const path = require('path');

const apiRoutes = [
    'auth',
    'users',
    'jobs',
    'candidates',
    'news',
    'audit',
    'recommendations',
    'chatbot',
    'comments'
];

const apiPath = path.join(__dirname, '..', 'routes', 'api');

console.log('Verificando rotas da API...\n');

let missingRoutes = [];

apiRoutes.forEach(route => {
    const routePath = path.join(apiPath, `${route}.js`);
    
    try {
        fs.accessSync(routePath);
        console.log(`✓ ${route}.js existe`);
    } catch (err) {
        console.log(`✗ ${route}.js não encontrado`);
        missingRoutes.push(route);
    }
});

if (missingRoutes.length > 0) {
    console.log('\nArquivos de rota faltando:');
    missingRoutes.forEach(route => {
        console.log(`- routes/api/${route}.js`);
    });
    console.log('\nPor favor, crie os arquivos faltantes antes de iniciar o servidor.');
    process.exit(1);
} else {
    console.log('\nTodas as rotas da API estão presentes!');
}