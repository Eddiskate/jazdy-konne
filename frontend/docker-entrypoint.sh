#!/bin/sh

# Skrypt startowy dla frontendu - wstrzykuje zmienne środowiskowe do aplikacji

echo "Uruchamianie frontendu..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

API_URL=${API_URL:-http://localhost:3000}
PORT=${PORT:-80}

if [ ! -f /usr/share/nginx/html/index.html ]; then
  echo "Błąd: index.html nie znaleziony!"
  exit 1
fi

echo "Pliki aplikacji znalezione"

cat > /usr/share/nginx/html/env-config.js <<EOF
// Runtime environment variables injected by docker-entrypoint.sh
window._env = {
  apiUrl: "${API_URL}",
  production: true
};
EOF

echo "Plik env-config.js utworzony z wartościami:"
echo "   API URL: ${API_URL}"

if ! grep -q "env-config.js" /usr/share/nginx/html/index.html; then
  echo "env-config.js nie jest w index.html, dodaję..."
  sed -i 's|</head>|<script src="/env-config.js"></script></head>|' /usr/share/nginx/html/index.html
fi

if nginx -t 2>/dev/null; then
  echo "Konfiguracja nginx poprawna"
else
  nginx -t
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Port: ${PORT}"
echo "API URL: ${API_URL}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exec nginx -g "daemon off;"
