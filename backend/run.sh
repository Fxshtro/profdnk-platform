#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# При проблемах с pypi.org задай зеркало, например:
# export PIP_INDEX_URL=https://mirrors.aliyun.com/pypi/simple/

if [[ ! -d .venv ]]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

echo ">>> Установка зависимостей (может занять несколько минут)..."
pip install --upgrade pip
pip install --default-timeout=300 -r requirements.txt

if [[ ! -f .env ]]; then
  echo ">>> Создаю .env из .env.example — отредактируй при необходимости"
  cp .env.example .env
fi

export PYTHONPATH="${PWD}"
echo ">>> Запуск http://127.0.0.1:8000/panel/"
exec uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
