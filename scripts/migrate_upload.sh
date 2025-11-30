#!/bin/bash

# Upload Migration Script - Moves uploads to user-specific folders
# Usage:
#   ./scripts/migrate_upload.sh          # Dry run (preview only)
#   ./scripts/migrate_upload.sh --run    # Actually perform migration

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_ROOT/server"

cd "$SERVER_DIR"

echo "================================"
echo "  Upload Migration Script"
echo "================================"
echo ""

if [ "$1" == "--run" ]; then
    echo "⚠️  LIVE MODE - Changes will be applied!"
    echo ""
    read -p "Are you sure you want to proceed? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
    npx tsx scripts/migrate-uploads-to-user-folders.ts
else
    echo "🔍 DRY RUN MODE - No changes will be made"
    echo "   Run with --run flag to apply changes"
    echo ""
    npx tsx scripts/migrate-uploads-to-user-folders.ts --dry-run
fi

echo ""
echo "Done!"
