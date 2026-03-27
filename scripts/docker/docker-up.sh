#!/bin/bash
set -e

pwd

bunx varlock run -p ./docker -- docker compose -f docker-compose.dev.yml up --build -d
