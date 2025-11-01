#!/usr/bin/env bash

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/electron.json"

# Show usage if no args or help requested
if [[ $# -eq 0 ]] || [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
    echo "Usage: $0 <package> <version> <platform>"
    echo ""
    echo "Arguments:"
    echo "  package   - Package name (e.g., electron, chromedriver)"
    echo "  version   - Version number or 'default' to use default version"
    echo "  platform  - Platform name or 'all' for all platforms"
    echo ""
    echo "Examples:"
    echo "  $0 electron default all"
    echo "  $0 electron 23.0.0 darwin-arm64"
    echo "  $0 chromedriver default mac-arm64"
    echo "  $0 ffmpeg 22.3.27 all"
    exit 0
fi

# Require all 3 arguments
if [[ $# -ne 3 ]]; then
    echo "Error: All 3 arguments are required"
    echo ""
    echo "Usage: $0 <package> <version> <platform>"
    echo ""
    echo "Use 'default' for version to use the default version"
    echo "Use 'all' for platform to download all platforms"
    echo ""
    echo "Run '$0 --help' for more information"
    exit 1
fi

# Parse arguments
PACKAGE="$1"
VERSION_ARG="$2"
PLATFORM="$3"

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "Error: jq is required but not installed. Please install jq to continue."
    exit 1
fi

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Read config values
DEFAULT_VERSION=$(jq -r '.default_version' "$CONFIG_FILE")
BASE_URL=$(jq -r '.base_url' "$CONFIG_FILE")
OUTPUT_DIR=$(jq -r '.output_dir' "$CONFIG_FILE")

# Use default version if "default" is specified
if [[ "$VERSION_ARG" == "default" ]]; then
    VERSION="$DEFAULT_VERSION"
else
    VERSION="$VERSION_ARG"
fi

# Resolve platform alias if provided
RESOLVED_PLATFORM=$(jq -r --arg p "$PLATFORM" '.platform_aliases[$p] // $p' "$CONFIG_FILE")

# Check if package exists in config
if ! jq -e --arg pkg "$PACKAGE" '.packages[$pkg]' "$CONFIG_FILE" > /dev/null 2>&1; then
    echo "Error: Package '$PACKAGE' not found in configuration"
    echo ""
    echo "Available packages:"
    jq -r '.packages | keys[]' "$CONFIG_FILE" | sed 's/^/  - /'
    exit 1
fi

# Function to download a file
downloadFile() {
    local filename="$1"
    local url="$2"
    local output_path="$3"

    echo "Downloading: $filename"
    echo "  URL: $url"
    echo "  Output: $output_path"

    mkdir -p "$(dirname "$output_path")"

    if command -v curl &> /dev/null; then
        if curl -L -f -o "$output_path" "$url"; then
            echo "  Success!"
            return 0
        else
            echo "  Failed to download"
            return 1
        fi
    elif command -v wget &> /dev/null; then
        if wget -O "$output_path" "$url"; then
            echo "  Success!"
            return 0
        else
            echo "  Failed to download"
            return 1
        fi
    else
        echo "Error: Neither curl nor wget is installed"
        exit 1
    fi
}

# Get available platforms for the package
AVAILABLE_PLATFORMS=$(jq -r --arg pkg "$PACKAGE" '.packages[$pkg] | keys[]' "$CONFIG_FILE")

# Determine which platforms to download
if [[ "$PLATFORM" == "all" ]]; then
    PLATFORMS_TO_DOWNLOAD=$AVAILABLE_PLATFORMS
else
    # Check if resolved platform exists for this package
    if echo "$AVAILABLE_PLATFORMS" | grep -q "^${RESOLVED_PLATFORM}$"; then
        PLATFORMS_TO_DOWNLOAD="$RESOLVED_PLATFORM"
    else
        echo "Error: Platform '$PLATFORM' (resolved to '$RESOLVED_PLATFORM') is not available for package '$PACKAGE'"
        echo ""
        echo "Available platforms for '$PACKAGE':"
        echo "$AVAILABLE_PLATFORMS" | sed 's/^/  - /'
        exit 1
    fi
fi

# Download files
SUCCESS_COUNT=0
FAILURE_COUNT=0

echo "========================================="
echo "Package: $PACKAGE"
echo "Version: $VERSION"
echo "Platform(s): $PLATFORM"
if [[ "$PLATFORM" != "$RESOLVED_PLATFORM" ]]; then
    echo "Resolved Platform: $RESOLVED_PLATFORM"
fi
echo "========================================="
echo ""

while IFS= read -r plat; do
    # Get filename template
    FILENAME_TEMPLATE=$(jq -r --arg pkg "$PACKAGE" --arg plat "$plat" '.packages[$pkg][$plat]' "$CONFIG_FILE")

    # Replace {version} placeholder
    FILENAME="${FILENAME_TEMPLATE//\{version\}/$VERSION}"

    # Build full URL
    if [[ "$plat" == "all" ]]; then
        FULL_URL="${BASE_URL}/v${VERSION}/${FILENAME}"
        OUTPUT_PATH="${OUTPUT_DIR}/${PACKAGE}/${FILENAME}"
    else
        FULL_URL="${BASE_URL}/v${VERSION}/${FILENAME}"
        OUTPUT_PATH="${OUTPUT_DIR}/${PACKAGE}/${VERSION}/${FILENAME}"
    fi

    if downloadFile "$FILENAME" "$FULL_URL" "$OUTPUT_PATH"; then
        ((SUCCESS_COUNT++))
    else
        ((FAILURE_COUNT++))
    fi
    echo ""
done <<< "$PLATFORMS_TO_DOWNLOAD"

# Summary
echo "========================================="
echo "Download Summary"
echo "========================================="
echo "Successful: $SUCCESS_COUNT"
echo "Failed: $FAILURE_COUNT"
echo "========================================="

if [[ $FAILURE_COUNT -gt 0 ]]; then
    exit 1
fi
