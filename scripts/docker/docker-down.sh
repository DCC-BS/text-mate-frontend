#!/bin/bash
set -e

varlock run -p ./docker -- docker -f docker-compose.dev.yml down
