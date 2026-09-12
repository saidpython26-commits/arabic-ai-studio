#!/usr/bin/env bash
set -e

OLLAMA_HOST="${OLLAMA_HOST:-http://localhost:11434}"
CHAT_MODEL="${DEFAULT_CHAT_MODEL:-llama3.1:8b}"
EMBED_MODEL="${DEFAULT_EMBED_MODEL:-nomic-embed-text}"
CODE_MODEL="${DEFAULT_CODE_MODEL:-qwen2.5-coder:7b}"

echo "=================================================="
echo " FreeGen AI Studio - Pulling Local Ollama Models"
echo " Ollama Host: $OLLAMA_HOST"
echo "=================================================="

# Wait for Ollama service to be ready
echo "Checking Ollama connection at $OLLAMA_HOST..."
until curl -s -f "$OLLAMA_HOST/api/tags" > /dev/null; do
  echo "Waiting for Ollama to start..."
  sleep 3
done

echo "Pulling chat model: $CHAT_MODEL..."
curl -s -X POST "$OLLAMA_HOST/api/pull" -d "{\"name\": \"$CHAT_MODEL\"}" | while read -r line; do
  echo "$line" | grep -o '"status":"[^"]*"' || true
done

echo "Pulling embedding model: $EMBED_MODEL..."
curl -s -X POST "$OLLAMA_HOST/api/pull" -d "{\"name\": \"$EMBED_MODEL\"}" | while read -r line; do
  echo "$line" | grep -o '"status":"[^"]*"' || true
done

echo "Pulling code model: $CODE_MODEL (optional)..."
curl -s -X POST "$OLLAMA_HOST/api/pull" -d "{\"name\": \"$CODE_MODEL\"}" | while read -r line; do
  echo "$line" | grep -o '"status":"[^"]*"' || true
done

echo "All required models pulled successfully for FreeGen AI Studio!"
