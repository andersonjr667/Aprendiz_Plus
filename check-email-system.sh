#!/bin/bash

# Script de Teste Rápido do Sistema de Emails
# Este script verifica se tudo está configurado corretamente

echo "🔍 Verificando Sistema de Emails - Aprendiz+"
echo "=============================================="
echo ""

# Verificar se o Node está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado"
    exit 1
fi
echo "✅ Node.js instalado: $(node -v)"

# Verificar se o MongoDB está rodando
if ! pgrep -x "mongod" > /dev/null; then
    echo "⚠️  MongoDB não está rodando (ou não foi detectado)"
else
    echo "✅ MongoDB está rodando"
fi

# Verificar se o arquivo .env existe
if [ ! -f .env ]; then
    echo "⚠️  Arquivo .env não encontrado"
    echo "   Copie .env.example para .env e configure as variáveis"
else
    echo "✅ Arquivo .env encontrado"
    
    # Verificar variáveis de email
    if grep -q "EMAIL_HOST=" .env && grep -q "EMAIL_USER=" .env; then
        echo "✅ Variáveis de email configuradas"
    else
        echo "⚠️  Variáveis de email não configuradas"
        echo "   Configure EMAIL_HOST, EMAIL_USER, etc no arquivo .env"
    fi
fi

echo ""
echo "📦 Verificando dependências..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules encontrado"
    
    if [ -d "node_modules/nodemailer" ]; then
        echo "✅ nodemailer instalado"
    else
        echo "❌ nodemailer não encontrado - execute: npm install nodemailer"
    fi
else
    echo "❌ node_modules não encontrado - execute: npm install"
fi

echo ""
echo "📁 Verificando arquivos do sistema de email..."

files=(
    "config/email.js"
    "config/emailTemplates.js"
    "services/emailService.js"
    "services/jobAlertService.js"
    "scripts/test-email-system.js"
    "scripts/send-job-alerts.js"
    "models/ContactMessage.js"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file não encontrado"
    fi
done

echo ""
echo "🧪 Testes disponíveis:"
echo "   npm run test-email    - Testar sistema de emails"
echo "   npm run send-alerts   - Enviar alertas de vagas"
echo ""

# Perguntar se quer executar o teste
read -p "Deseja executar o teste do sistema de emails agora? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[SsYy]$ ]]; then
    echo ""
    echo "🚀 Executando teste..."
    npm run test-email
fi
