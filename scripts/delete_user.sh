#!/bin/bash

# Delete User Script
# Removes a user and all their associated data from the database
#
# Usage:
#   ./scripts/delete_user.sh <email>              # Delete user (with confirmation)
#   ./scripts/delete_user.sh <email> --dry-run    # Preview what would be deleted

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$PROJECT_ROOT/server"

if [ -z "$1" ]; then
    echo "Usage: $0 <email> [--dry-run]"
    echo ""
    echo "Options:"
    echo "  --dry-run    Preview what would be deleted without making changes"
    echo ""
    echo "Examples:"
    echo "  $0 user@example.com --dry-run    # Preview deletion"
    echo "  $0 user@example.com              # Delete user"
    exit 1
fi

EMAIL="$1"
DRY_RUN=""

if [ "$2" == "--dry-run" ]; then
    DRY_RUN="--dry-run"
fi

cd "$SERVER_DIR"

if [ -z "$DRY_RUN" ]; then
    echo "⚠️  WARNING: This will permanently delete the user and all their data!"
    echo ""
    read -p "Are you sure you want to delete '$EMAIL'? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Aborted."
        exit 0
    fi
    echo ""
fi

npx tsx scripts/delete-user.ts "$EMAIL" $DRY_RUN
