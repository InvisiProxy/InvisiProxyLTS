#!/bin/sh
# Tor is optional and can exceed the memory limit on small hosting plans.
if [ "${ENABLE_TOR:-false}" = "true" ]; then
	tor &
fi

# The Docker image is built before startup, so avoid rebuilding at runtime.
exec node dist/server.js
