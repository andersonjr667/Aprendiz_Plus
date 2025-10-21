// Função para carregar e injetar componentes
async function loadComponents() {
    try {
        // Carregar o conteúdo do arquivo components.html
        const response = await fetch('/pages/components.html');
        const content = await response.text();

        // Criar um elemento temporário para parsear o HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, 'text/html');

        // Extrair o header e o footer
        const header = doc.querySelector('header');
        const footer = doc.querySelector('footer');

        // Injetar o header no início do body
        document.body.insertBefore(header, document.body.firstChild);

        // Injetar o footer antes do último script
        const scripts = document.body.getElementsByTagName('script');
        if (scripts.length > 0) {
            document.body.insertBefore(footer, scripts[0]);
        } else {
            document.body.appendChild(footer);
        }

        // Verificar autenticação para atualizar a navegação
        checkAuth();

        // Adicionar classe active ao link atual
        const currentPath = window.location.pathname;
        document.querySelectorAll('.nav-menu a').forEach(link => {
            if (link.getAttribute('href') === currentPath) {
                link.classList.add('active');
            }
        });

        // Adicionar funcionalidade de scroll para o header
        window.addEventListener('scroll', () => {
            if (window.scrollY > 100) {
                header.classList.add('header-active');
            } else {
                header.classList.remove('header-active');
            }
        });

    } catch (error) {
        console.error('Erro ao carregar componentes:', error);
    }
}