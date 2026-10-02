#!/bin/bash

cd apps/viewer;
node  -e "const { configureRuntimeEnv } = require('next-runtime-env/build/configure'); configureRuntimeEnv();"
cd ../..;

# exec: node becomes PID 1 and gets SIGTERM, so a rollout drains instead of
# being killed. NODE_OPTIONS from the pod (e.g. --max-old-space-size) is kept.
NODE_OPTIONS="--no-node-snapshot ${NODE_OPTIONS:-}" HOSTNAME=0.0.0.0 PORT=3000 exec node apps/viewer/server.js