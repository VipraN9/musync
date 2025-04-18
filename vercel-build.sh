#!/bin/bash

# Install dependencies
npm install

# Build the frontend
npm run build

# Move built files to the correct location
mkdir -p dist/public
cp -r dist/* dist/public/

# Make sure the server files are executable
chmod +x dist/index.js

# Build the server
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist 