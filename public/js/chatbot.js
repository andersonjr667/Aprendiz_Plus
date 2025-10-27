// Chatbot widget básico que responde a intenções pré-definidas
const chatbotData = {
  candidato: [
    { q: 'como me candidatar', a: 'Vá até a vaga desejada e clique em "Aplicar". Você pode enviar seu currículo em PDF.' },
    { q: 'recomendações', a: 'Use seu perfil para adicionar skills e receber recomendações na sua dashboard.' }
  ],
  empresa: [
    { q: 'publicar vaga', a: 'Vá em Publicar Vaga e siga o formulário multi-step.' },
    { q: 'ver candidatos', a: 'Acesse a vaga publicada e clique em ver candidaturas.' }
  ]
};

function botReply(userType, message) {
  const list = chatbotData[userType] || [];
  const m = message.toLowerCase();
  for (const item of list) {
    if (m.includes(item.q)) return item.a;
  }
  return 'Desculpe, não entendi. Tente palavras como "publicar vaga" ou "como me candidatar".';
}

window.botReply = botReply;
