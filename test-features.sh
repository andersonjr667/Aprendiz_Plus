#!/bin/bash

# test-features.sh — versão melhorada com testes automáticos (GET) e opções
# Uso:
#   chmod +x test-features.sh
#   ./test-features.sh
# Opções via env vars:
#   VERBOSE=1               # mostra respostas completas
#   AUTH_TOKEN="..."       # token Bearer para endpoints autenticados
#   ENABLE_WRITE_TESTS=1    # Habilita testes POST/PUT/DELETE (opcional, destrutivo)

ROOT_URL="http://localhost:3000"
TIMEOUT=10

# cores (se terminal suportar)
GREEN="\e[32m"
RED="\e[31m"
YELLOW="\e[33m"
RESET="\e[0m"

fail_count=0
skipped_count=0
total_count=0

info(){ printf "${YELLOW}%s${RESET}\n" "$1"; }
ok(){ printf "${GREEN}%s${RESET}\n" "$1"; }
err(){ printf "${RED}%s${RESET}\n" "$1"; }

http_headers(){
    local headers=("-s" "-o" "/dev/null" "-w" "%{http_code}")
    echo "${headers[@]}"
}

check_server(){
    total_count=$((total_count+1))
    code=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${TIMEOUT} "${ROOT_URL}/")
    if [ "$code" -ge 200 ] && [ "$code" -lt 600 ]; then
        ok "✅ Servidor respondeu (HTTP $code)"
    else
        err "❌ Servidor não respondeu em ${ROOT_URL} (HTTP $code)"
        fail_count=$((fail_count+1))
    fi
}

test_get(){
    local endpoint="$1"
    local expect_code="$2"
    local expect_contains="$3"
    total_count=$((total_count+1))
    url="${ROOT_URL}${endpoint}"
    if [ -n "$AUTH_TOKEN" ]; then
        auth_header=("-H" "Authorization: Bearer ${AUTH_TOKEN}")
    else
        auth_header=()
    fi

    if [ "$VERBOSE" = "1" ]; then
        response=$(curl -s --max-time ${TIMEOUT} -H "Accept: application/json" "${auth_header[@]}" "$url")
        code=$(printf "%s" "$response" | tail -n1; printf "")
        # when VERBOSE we also want the http code — do a separate call
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${TIMEOUT} "${auth_header[@]}" "$url")
    else
        code=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${TIMEOUT} "${auth_header[@]}" "$url")
    fi

    if [ "$code" -eq "$expect_code" ]; then
        if [ -n "$expect_contains" ]; then
            body=$(curl -s --max-time ${TIMEOUT} "${auth_header[@]}" "$url")
            if printf "%s" "$body" | grep -q -F "$expect_contains"; then
                ok "✅ GET ${endpoint} (HTTP $code) — conteúdo OK"
            else
                err "❌ GET ${endpoint} (HTTP $code) — conteúdo esperado não encontrado: ${expect_contains}"
                if [ "$VERBOSE" = "1" ]; then
                    printf "%s\n" "$body"
                fi
                fail_count=$((fail_count+1))
            fi
        else
            ok "✅ GET ${endpoint} (HTTP $code)"
        fi
    else
        err "❌ GET ${endpoint} falhou (HTTP $code, esperado $expect_code)"
        fail_count=$((fail_count+1))
        if [ "$VERBOSE" = "1" ]; then
            body=$(curl -s --max-time ${TIMEOUT} "${auth_header[@]}" "$url")
            printf "%s\n" "$body"
        fi
    fi
}

echo "======================================"
echo "APRENDIZ PLUS - TESTE DE FUNCIONALIDADES (AUTOMATIZADO)"
echo "======================================"

check_server

echo ""
echo "======================================"
echo "TESTES AUTOMÁTICOS DE ENDPOINTS:" 
echo "======================================"

# Public endpoints (no auth required). Add entries here if your API exposes public
# resources that should be tested without a token.
declare -A public_endpoints_expected=(
)

declare -A public_endpoints_contains=(
)

for ep in "${!public_endpoints_expected[@]}"; do
    expect=${public_endpoints_expected[$ep]}
    contains=${public_endpoints_contains[$ep]:-}
    test_get "$ep" "$expect" "$contains"
done

# Authenticated endpoints: these will only be executed when AUTH_TOKEN is set.
# This avoids spurious 401 failures when running locally without credentials.
declare -A auth_endpoints_expected=(
    ["/api/chats"]=200
    ["/api/notifications"]=200
    ["/api/favorites"]=200
    ["/api/reviews"]=200
    ["/api/gamification/stats"]=200
    ["/api/dashboard/candidate"]=200
)

declare -A auth_endpoints_contains=(
    ["/api/notifications"]="notifications"
    ["/api/chats"]="chats"
    ["/api/gamification/stats"]="leaderboard"
)

if [ -n "$AUTH_TOKEN" ]; then
    info "Executando testes autenticados com token fornecido"
    for ep in "${!auth_endpoints_expected[@]}"; do
        expect=${auth_endpoints_expected[$ep]}
        contains=${auth_endpoints_contains[$ep]:-}
        test_get "$ep" "$expect" "$contains"
    done
else
    skipped_count=$((skipped_count+${#auth_endpoints_expected[@]}))
    info "Pulando ${#auth_endpoints_expected[@]} testes autenticados (defina AUTH_TOKEN para executá-los)"
fi

echo ""
echo "======================================"
echo "TESTES DE PÁGINAS HTML:" 
echo "======================================"

test_get "/public/pages/chat.html" 200 "Chat"
test_get "/public/pages/dashboard-candidato.html" 200 "Dashboard"
test_get "/public/pages/favoritos.html" 200 "Favoritos"

echo ""
echo "======================================"
echo "OPÇÕES DE TESTES DE ESCRITA (POST/PUT/DELETE)"
echo "======================================"

if [ "${ENABLE_WRITE_TESTS}" = "1" ]; then
    if [ -z "${AUTH_TOKEN}" ]; then
        err "⚠️  ENABLE_WRITE_TESTS=1 mas AUTH_TOKEN não definido — pulando testes de escrita (para segurança)"
        fail_count=$((fail_count+1))
    else
        info "Executando testes de escrita (cuidado: podem alterar dados reais)"
        # Exemplo seguro: tentar criar um recurso 'ping' se existir endpoint de teste
        # Nota: por segurança não executamos POSTs por padrão. Usuário pode personalizar aqui.
    fi
else
    info "Testes de escrita desabilitados. Para habilitar: ENABLE_WRITE_TESTS=1 and set AUTH_TOKEN"
fi

echo ""
echo "======================================"
echo "RESUMO"
echo "======================================"
echo "Total de verificações: ${total_count}"
if [ "$fail_count" -eq 0 ]; then
    ok "✅ Todos os testes passaram"
    exit 0
else
    err "❌ ${fail_count} testes falharam"
    err "Execute com VERBOSE=1 para ver respostas completas e investigue os endpoints com falha."
    exit 1
fi
