#!/bin/sh
# Serves the E2E production build on port 4300.
#
# Shared entrypoint: invoked by `mise run e2e:serve` AND directly by the
# Playwright webServer. The `exec` matters: Playwright signals and tears down
# its webServer via process groups and waits for the stdio pipes to close —
# wrapping the server in `mise run` here leaks the pipes (mise detaches its
# task into its own process group), which hangs Playwright's teardown
# flakily. This script must stay a single foreground process.
set -eu

# APP_MODE=ci bakes in the dummy fetchers; the disable flags turn off the
# changelog/disclaimer/onboarding overlays that would otherwise block clicks.
export APP_MODE="ci"
export AUTH_MODE="none"
export DUMMY="true"
export PORT="4300"
export NUXT_PUBLIC_COMMON_UI_DISABLE_CHANGELOG="true"
export NUXT_PUBLIC_COMMON_UI_DISABLE_DISCLAIMER="true"
export NUXT_PUBLIC_COMMON_UI_DISABLE_ONBOARDING="true"

exec node .output/server/index.mjs
