#!/bin/bash
set -a
source "$(dirname "$0")/.env"
set +a
export OBJC_DISABLE_INITIALIZE_FORK_SAFETY=YES
exec "$(dirname "$0")/.venv/bin/functions-framework" --target=ask_rag --port=8082
