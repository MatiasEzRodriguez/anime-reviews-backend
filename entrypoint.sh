#!/bin/sh
set -e

if [ -z "$SERVICE" ]; then
  echo "ERROR: SERVICE environment variable is not set. Example: SERVICE=users"
  exit 1
fi

echo "Starting service: $SERVICE"
exec node "build/services/${SERVICE}/main.js"
