#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Load custom config if exists, otherwise use default
if [[ -f "$SCRIPT_DIR/docker.config.sh" ]]; then
	source "$SCRIPT_DIR/docker.config.sh"
else
	function load_env() {
		(set -a; source .env 2>/dev/null; set +a; source docker/.env.backend 2>/dev/null; "$@")
	}
fi

# Load environment variables and run docker compose in same scope
load_env docker compose -f docker-compose.dev.yml down
