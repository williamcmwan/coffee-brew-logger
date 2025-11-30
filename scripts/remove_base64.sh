#!/bin/bash

# Remove Base64 Images from Database
# This script finds and removes base64-encoded images stored directly in the database
# Usage:
#   ./scripts/remove_base64.sh          # Dry run (show what would be removed)
#   ./scripts/remove_base64.sh --run    # Actually remove base64 data

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DB_PATH="$PROJECT_ROOT/server/data/brew-journal.db"

echo "================================"
echo "  Remove Base64 Images Script"
echo "================================"
echo ""

if [ ! -f "$DB_PATH" ]; then
    echo "Error: Database not found at $DB_PATH"
    exit 1
fi

echo "Database: $DB_PATH"
echo ""

# Tables with photo columns
TABLES="grinders brewers recipes coffee_beans brews coffee_servers"

echo "Scanning for base64 images..."
echo ""

TOTAL_FOUND=0

for TABLE in $TABLES; do
    # Get item name column based on table
    case $TABLE in
        grinders|brewers|coffee_servers)
            NAME_COL="model"
            ;;
        recipes|coffee_beans)
            NAME_COL="name"
            ;;
        brews)
            NAME_COL="id"
            ;;
    esac
    
    # Find base64 images in this table
    RESULTS=$(sqlite3 "$DB_PATH" "SELECT u.email, t.$NAME_COL FROM $TABLE t JOIN users u ON t.user_id = u.id WHERE t.photo LIKE 'data:%';" 2>/dev/null || true)
    
    if [ -n "$RESULTS" ]; then
        echo "=== $TABLE ==="
        echo "$RESULTS" | while IFS='|' read -r email item_name; do
            echo "  User: $email"
            echo "  Item: $item_name"
            echo ""
        done
        COUNT=$(echo "$RESULTS" | wc -l | tr -d ' ')
        TOTAL_FOUND=$((TOTAL_FOUND + COUNT))
    fi
done

# Recount total for accurate number
TOTAL_FOUND=$(sqlite3 "$DB_PATH" "
    SELECT 
        (SELECT COUNT(*) FROM grinders WHERE photo LIKE 'data:%') +
        (SELECT COUNT(*) FROM brewers WHERE photo LIKE 'data:%') +
        (SELECT COUNT(*) FROM recipes WHERE photo LIKE 'data:%') +
        (SELECT COUNT(*) FROM coffee_beans WHERE photo LIKE 'data:%') +
        (SELECT COUNT(*) FROM brews WHERE photo LIKE 'data:%') +
        (SELECT COUNT(*) FROM coffee_servers WHERE photo LIKE 'data:%')
    ;" 2>/dev/null || echo "0")

echo "--------------------------------"
echo "Total items with base64 images: $TOTAL_FOUND"
echo ""

if [ "$TOTAL_FOUND" -eq 0 ]; then
    echo "✓ No base64 images found. Database is clean!"
    exit 0
fi

if [ "$1" = "--run" ]; then
    echo "⚠️  Removing base64 images..."
    echo ""
    
    for TABLE in $TABLES; do
        COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM $TABLE WHERE photo LIKE 'data:%';" 2>/dev/null || echo "0")
        if [ "$COUNT" -gt 0 ]; then
            sqlite3 "$DB_PATH" "UPDATE $TABLE SET photo = NULL WHERE photo LIKE 'data:%';"
            echo "  Cleared $COUNT item(s) in $TABLE"
        fi
    done
    
    echo ""
    echo "✓ Base64 images removed. Users will need to re-upload photos."
else
    echo "⚠️  DRY RUN - No changes made."
    echo "   Run with --run flag to remove base64 images."
fi
