#!/bin/bash

# Script para adicionar AI Assistant em todas as páginas HTML

echo "🤖 Adicionando AI Assistant em todas as páginas..."

# Diretório das páginas
PAGES_DIR="/home/anderson/Aprendiz_Plus/public/pages"

# CSS line to add (before </head>)
CSS_LINE='    <!-- AI Assistant -->\n    <link rel="stylesheet" href="/public/css/ai-assistant.css">'

# JS line to add (before </body>)
JS_LINE='    <!-- AI Assistant -->\n    <script src="/public/js/ai-assistant.js"></script>'

# Contador
count=0

# Processar cada arquivo HTML
for file in "$PAGES_DIR"/*.html; do
  filename=$(basename "$file")
  
  # Pular se já tiver o AI Assistant
  if grep -q "ai-assistant.css" "$file"; then
    echo "⏭️  $filename - já tem AI Assistant"
    continue
  fi
  
  # Fazer backup
  cp "$file" "$file.bak"
  
  # Adicionar CSS antes de </head>
  sed -i 's|</head>|'"$CSS_LINE"'\n</head>|' "$file"
  
  # Adicionar JS antes de </body>
  sed -i 's|</body>|'"$JS_LINE"'\n</body>|' "$file"
  
  echo "✅ $filename - AI Assistant adicionado"
  ((count++))
done

echo ""
echo "✨ Concluído! $count arquivo(s) atualizado(s)"
echo "📁 Backups salvos com extensão .bak"
