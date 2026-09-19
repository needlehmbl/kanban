#!/usr/bin/env bash
# kanban.sh — run or stop the whole kanban stack (postgres + api + web).
#
#   ./kanban.sh start    # docker compose up, wait for API + web
#   ./kanban.sh stop     # docker compose down
#   ./kanban.sh restart  # stop, then start
#   ./kanban.sh status   # show whether each service is up
#   ./kanban.sh logs     # follow compose logs
#
# First run copies .env.example to .env if missing — fill in
# GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET before starting.
# URLs: web http://localhost:5176 (demo: /boards?demo=1), api http://localhost:4000/health

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_URL="http://localhost:4000/health"
WEB_URL="http://localhost:5176"

need_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "ERROR: docker daemon not reachable (is Docker running?)."
    exit 1
  fi
}

ensure_env() {
  if [ ! -f "$ROOT/.env" ]; then
    echo "+ creating .env from .env.example — fill in GITHUB_CLIENT_ID/SECRET"
    cp "$ROOT/.env.example" "$ROOT/.env"
  fi
  if grep -qE '^GITHUB_CLIENT_ID=$' "$ROOT/.env"; then
    echo "NOTE: GITHUB_CLIENT_ID is empty in .env — GitHub login will fail until set."
    echo "      The ?demo=1 board works without OAuth."
  fi
}

is_up() { curl -sf -o /dev/null "$1" 2>/dev/null; }

cmd_start() {
  need_docker
  ensure_env
  echo "+ starting stack (postgres + api + web)..."
  (cd "$ROOT" && docker compose up -d --build) || exit 1
  echo "+ waiting for services..."
  for _ in $(seq 1 60); do
    sleep 2
    if is_up "$API_URL" && is_up "$WEB_URL/"; then break; fi
  done
  echo ""
  is_up "$API_URL" \
    && echo "  api: http://localhost:4000/health  UP" \
    || echo "  api: DOWN — see ./kanban.sh logs"
  is_up "$WEB_URL/" \
    && echo "  web: $WEB_URL  UP (demo: $WEB_URL/boards?demo=1)" \
    || echo "  web: DOWN — see ./kanban.sh logs"
}

cmd_stop() {
  need_docker
  (cd "$ROOT" && docker compose down) || exit 1
}

cmd_status() {
  if docker compose version >/dev/null 2>&1; then
    (cd "$ROOT" && docker compose ps 2>/dev/null)
    echo ""
  fi
  is_up "$API_URL" && echo "api (:4000): UP" || echo "api (:4000): DOWN"
  is_up "$WEB_URL/" && echo "web (:5176): UP" || echo "web (:5176): DOWN"
}

usage() {
  sed -n '2,13p' "${BASH_SOURCE[0]}" | sed 's/^# \?//'
}

case "${1:-start}" in
  start)   cmd_start ;;
  stop)    cmd_stop ;;
  restart) cmd_stop; echo ""; cmd_start ;;
  status)  cmd_status ;;
  logs)    (cd "$ROOT" && docker compose logs -f --tail=100) ;;
  -h|--help|help) usage ;;
  *) echo "Unknown command: $1"; usage; exit 1 ;;
esac
