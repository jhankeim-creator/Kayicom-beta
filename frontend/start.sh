#!/bin/bash
# Railway startup script for frontend
npm install
npm run build
npx serve -s build -l ${PORT:-3000}

