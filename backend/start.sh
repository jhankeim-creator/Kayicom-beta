#!/bin/bash
# Railway startup script for backend
uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}

