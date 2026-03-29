#!/bin/bash
set -e

cd docker
bunx varlock run -- docker compose -f docker-compose.dev.yml up --build -d
