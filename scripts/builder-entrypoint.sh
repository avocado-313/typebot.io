#!/bin/bash

cd apps/builder;
node  -e "const { configureRuntimeEnv } = require('next-runtime-env/build/configure'); configureRuntimeEnv();"
cd ../..;

echo 'Waiting for 15s for database to be ready...';
sleep 15;

./node_modules/.bin/prisma migrate deploy --schema=packages/prisma/postgresql/schema.prisma;

# Same as the viewer: exec so node gets SIGTERM; keep the pod's NODE_OPTIONS.
NODE_OPTIONS="--no-node-snapshot ${NODE_OPTIONS:-}" HOSTNAME=0.0.0.0 PORT=3000 exec node apps/builder/server.js
