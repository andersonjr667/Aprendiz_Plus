#!/bin/bash

# Script para adicionar favicon em todas as páginas HTML

FAVICON_LINE='    <link rel="icon" type="image/png" href="/public/images/logo.png">'

# Percorre todos os arquivos HTML
for file in public/pages/*.html; do
    # Verifica se o arquivo já tem o favicon
    if grep -q 'rel="icon"' "$file"; then
        echo "✓ $file já tem favicon"
    else
        # Procura pela tag <head> e adiciona o favicon logo após
        if grep -q '<head>' "$file"; then
            # Usa sed para adicionar o favicon após a tag <head>
            sed -i '/<head>/a\'"$FAVICON_LINE" "$file"
            echo "✓ Favicon adicionado em $file"
        else
            echo "✗ Tag <head> não encontrada em $file"
        fi
    fi
done

echo ""
echo "Processo concluído!"
