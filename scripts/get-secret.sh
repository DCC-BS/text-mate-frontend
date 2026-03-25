#!/bin/bash

source ~/.bashrc 2>/dev/null || source ~/.zshrc 2>/dev/null || source ~/.profile 2>/dev/null

PASS_CLI="$HOME/.local/bin/pass-cli"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env.get-secret"

if [ -f "$ENV_FILE" ]; then
    while IFS='=' read -r key value; do
        if [ "$key" = "PASS_CLI_PATH" ]; then
            PASS_CLI="${value/#\~/$HOME}"
        fi
    done < "$ENV_FILE"
fi

exec "$PASS_CLI" item view "$@"
