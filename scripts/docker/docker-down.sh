#!/bin/bash
set -e

varlock run -p ./docker -- docker compose -f docker-compose.dev.yml down
