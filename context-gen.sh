#!/usr/bin/env bash

# Usage: ./pack-codebase.sh [target_directory] [output_file]
TARGET_DIR="${1:-.}"
OUTPUT_FILE="${2:-codebase_context.md}"

# Ensure target directory exists
if [ ! -d "$TARGET_DIR" ]; then
    echo "Error: Directory '$TARGET_DIR' does not exist."
    exit 1
fi

# Resolve absolute path for cleaner output headers
TARGET_DIR=$(cd "$TARGET_DIR" && pwd)

# Directories and files to exclude
EXCLUDE_DIRS="node_modules|\.git|dist|build|\.next|out|coverage|\.vercel|\.husky|\.vscode|\.idea"
EXCLUDE_FILES="package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|\.DS_Store|.*\.min\.js|.*\.map|.*\.svg|.*\.png|.*\.jpg|.*\.jpeg|.*\.gif|.*\.ico|.*\.woff2?|.*\.ttf|.*\.eot"

# File extensions to include
INCLUDE_EXTS="js|jsx|ts|tsx|json|css|scss|sass|less|html|md|env\.example|graphql|gql"

# Initialize output file
cat << EOF > "$OUTPUT_FILE"
# Codebase Context
**Generated on:** $(date)
**Root Directory:** \`$(basename "$TARGET_DIR")\`

## Directory Structure
\`\`\`text
EOF

# Generate directory tree (uses 'tree' if installed, otherwise falls back to 'find')
if command -v tree &> /dev/null; then
    tree -a -I "node_modules|.git|dist|build|.next|out|coverage|.DS_Store" "$TARGET_DIR" >> "$OUTPUT_FILE"
else
    (cd "$TARGET_DIR" && find . -maxdepth 5 -not -path '*/.*' -not -path './node_modules*' -not -path './dist*' -not -path './build*' -not -path './.next*' | sort) >> "$OUTPUT_FILE"
fi

cat << EOF >> "$OUTPUT_FILE"
\`\`\`

---

## File Contents

EOF

# Counter for processed files
FILE_COUNT=0

# Find and process files safely (handles spaces in filenames)
while IFS= read -r -d '' filepath; do
    # Get relative path
    rel_path="${filepath#$TARGET_DIR/}"

    # Skip the output file itself if generated inside the target directory
    if [ "$(basename "$filepath")" == "$(basename "$OUTPUT_FILE")" ]; then
        continue
    fi

    # Skip excluded directories
    if echo "$rel_path" | grep -Eq "(^|/)($EXCLUDE_DIRS)(/|$)"; then
        continue
    fi

    # Skip excluded filenames
    if echo "$(basename "$filepath")" | grep -Eq "^($EXCLUDE_FILES)$"; then
        continue
    fi

    # Check if extension matches allowed list
    filename=$(basename "$filepath")
    ext="${filename##*.}"
    
    # Handle files like .env.example or standard extensions
    if ! echo "$filename" | grep -Eq "\.($INCLUDE_EXTS)$"; then
        continue
    fi

    # Map file extensions to Markdown code-block syntax identifiers
    case "$ext" in
        js|jsx) lang="jsx" ;;
        ts|tsx) lang="tsx" ;;
        json) lang="json" ;;
        css|scss|sass|less) lang="$ext" ;;
        html) lang="html" ;;
        md) lang="markdown" ;;
        graphql|gql) lang="graphql" ;;
        *) lang="" ;;
    esac

    # Append file header and contents to Markdown
    echo "### \`$rel_path\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo "\`\`\`$lang" >> "$OUTPUT_FILE"
    cat "$filepath" >> "$OUTPUT_FILE"
    
    # Ensure a trailing newline before closing the code block
    if [ -n "$(tail -c 1 "$filepath")" ]; then
        echo "" >> "$OUTPUT_FILE"
    fi
    
    echo "\`\`\`" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    ((FILE_COUNT++))

done < <(find "$TARGET_DIR" -type f -print0 | sort -z)

# Print summary to terminal
FILE_SIZE=$(du -h "$OUTPUT_FILE" | cut -f1)
echo "Done! Packed $FILE_COUNT files into '$OUTPUT_FILE' ($FILE_SIZE)."