#!/bin/bash

# Cleanup Orphan Uploads Script - Removes files not referenced in database
# Usage:
#   ./scripts/cleanup_orphan_upload.sh          # Dry run (preview only)
#   ./scripts/cleanup_orphan_upload.sh --run    # Actually delete orphan files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_ROOT/server"

cd "$SERVER_DIR"

echo "================================"
echo "  Cleanup Orphan Uploads"
echo "================================"
echo ""

if [ "$1" == "--run" ]; then
    echo "⚠️  LIVE MODE - Orphan files will be deleted!"
    echo ""
    read -p "Are you sure you want to proceed? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
    npx tsx scripts/cleanup-orphan-uploads.ts
else
    echo "🔍 DRY RUN MODE - No files will be deleted"
    echo "   Run with --run flag to delete orphan files"
    echo ""
    npx tsx scripts/cleanup-orphan-uploads.ts --dry-run
fi

echo ""
echo "Done!"
