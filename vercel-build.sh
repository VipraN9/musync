#!/bin/bash

# Install dependencies
npm install

# Build the frontend
npm run build

# Make the build directory
mkdir -p dist/public

# Move the built files to the correct location
mv dist/* dist/public/ 2>/dev/null || true

# Build the server
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 