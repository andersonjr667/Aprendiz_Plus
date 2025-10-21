const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// Processamento de linguagem natural simplificado
const processMessage = (message) => {
    // Converter para minúsculas e remover pontuações
    const normalizedMessage = message.toLowerCase().replace(/[^\w\s]/g, '');
    const words = normalizedMessage.split(/\s+/);
    return { words, normalized: normalizedMessage };
};

// Base de conhecimento para diferentes tipos de usuários
const knowledgeBase = {
    candidato: {
        keywords: {
            'vaga': ['Como encontrar vagas?', 'Use a página de vagas e aplique os filtros necessários. Você também pode ver recomendações personalizadas baseadas no seu perfil.'],
            'perfil': ['Como atualizar meu perfil?', 'Acesse seu perfil e clique em editar para atualizar suas informações, habilidades e experiências.'],
            'candidatura': ['Como acompanhar minhas candidaturas?', 'Na página do seu perfil, você pode ver todas as vagas para as quais se candidatou e seus status.'],
            'recomendação': ['Como funcionam as recomendações?', 'Nosso sistema analisa seu perfil, habilidades e experiências para sugerir as vagas mais compatíveis.'],
            'curso': ['Como adicionar cursos?', 'No seu perfil, vá para a seção "Cursos e Certificações" e clique em adicionar novo.'],
            'habilidade': ['Como adicionar habilidades?', 'No seu perfil, procure a seção "Habilidades" e use o botão de adicionar para incluir novas habilidades.']
        },
        default: 'Posso ajudar com informações sobre vagas, seu perfil, candidaturas e recomendações. O que você gostaria de saber?'
    },
    empresa: {
        keywords: {
            'vaga': ['Como publicar uma vaga?', 'Acesse a página "Publicar Vaga" e preencha todos os campos necessários com os detalhes da oportunidade.'],
            'candidato': ['Como ver candidatos?', 'Na página de vagas publicadas, clique em uma vaga específica para ver os candidatos que se inscreveram.'],
            'perfil': ['Como atualizar perfil da empresa?', 'Acesse o perfil da empresa e use o botão de edição para atualizar as informações.'],
            'noticia': ['Como publicar notícias?', 'Na seção de notícias, use o botão "Publicar Nova Notícia" e preencha o formulário.'],
            'recomendação': ['Como funcionam as recomendações de candidatos?', 'Nosso sistema analisa as habilidades e experiências dos candidatos para sugerir os mais compatíveis com suas vagas.']
        },
        default: 'Posso ajudar com informações sobre publicação de vagas, gestão de candidatos e perfil da empresa. Como posso ajudar?'
    },
    admin: {
        keywords: {
            'usuario': ['Como gerenciar usuários?', 'No painel administrativo, você pode ver todos os usuários, editar suas informações ou desativar contas quando necessário.'],
            'noticia': ['Como gerenciar notícias?', 'Use o painel de notícias para aprovar, editar ou remover publicações de empresas e adicionar notícias administrativas.'],
            'vaga': ['Como moderar vagas?', 'No painel de vagas, você pode revisar, aprovar ou remover vagas publicadas pelas empresas.'],
            'auditoria': ['Como ver logs de auditoria?', 'Acesse a seção de Auditoria para ver todas as ações realizadas na plataforma.']
        },
        default: 'Como administrador, posso ajudar com gerenciamento de usuários, moderação de conteúdo e auditoria. O que você precisa?'
    }
};

// Encontrar a melhor resposta baseada nas palavras-chave
const findBestResponse = (words, userType) => {
    const kb = knowledgeBase[userType];
    if (!kb) return 'Tipo de usuário não reconhecido.';

    // Procurar por correspondências nas palavras-chave
    for (const [keyword, [question, answer]] of Object.entries(kb.keywords)) {
        if (words.includes(keyword)) {
            return {
                question,
                answer
            };
        }
    }

    return {
        question: 'Ajuda geral',
        answer: kb.default
    };
};

// Função principal do chatbot
async function handleChatMessage(userId, message) {
    try {
        // Buscar usuário
        const user = await User.findById(userId);
        if (!user) {
            throw new Error('Usuário não encontrado');
        }

        // Processar a mensagem
        const { words } = processMessage(message);
        
        // Obter resposta baseada no tipo de usuário
        const response = findBestResponse(words, user.type);

        // Registrar interação no log de auditoria
        await AuditLog.create({
            user: userId,
            action: 'chatbot_interaction',
            details: {
                message,
                response: response.answer,
                userType: user.type
            }
        });

        return {
            status: 'success',
            response
        };

    } catch (error) {
        console.error('Erro no chatbot:', error);
        return {
            status: 'error',
            message: 'Não foi possível processar sua mensagem no momento. Por favor, tente novamente.'
        };
    }
}

module.exports = {
    handleChatMessage
};