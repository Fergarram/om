#!/usr/bin/env bash

# NAME
#     download_electron.sh - Download Electron and related packages
#
# SYNOPSIS
#     download_electron.sh PACKAGE VERSION PLATFORM
#     download_electron.sh -h | --help
#
# DESCRIPTION
#     Downloads Electron binaries and related packages (chromedriver, ffmpeg)
#     from the official Electron release repository. Supports downloading
#     specific platforms or all platforms at once.
#
#     The script reads configuration from electron.json, which defines:
#     - Base URL for downloads
#     - Default version
#     - Output directory structure
#     - Package filename templates
#     - Platform aliases
#
#     Downloaded files are organized in a directory structure:
#         output_dir/package/version/filename
#
#     For example:
#         bin/electron-packages/electron/23.0.0/electron-v23.0.0-darwin-arm64.zip
#
# ARGUMENTS
#     PACKAGE
#         Package name to download. Must be defined in electron.json.
#         Common packages: electron, chromedriver, ffmpeg
#
#     VERSION
#         Version number to download (e.g., 23.0.0, 22.3.27)
#         Use "default" to download the version specified in electron.json
#
#     PLATFORM
#         Platform identifier or "all" to download all available platforms.
#         Platform names are package-specific and defined in electron.json.
#
#         Common Electron platforms:
#           darwin-arm64    macOS Apple Silicon
#           darwin-x64      macOS Intel
#           linux-arm64     Linux ARM64
#           linux-x64       Linux x64
#           win32-arm64     Windows ARM64
#           win32-x64       Windows x64
#
#         Platform aliases (defined in electron.json):
#           mac-arm64       -> darwin-arm64
#           mac-x64         -> darwin-x64
#
# OPTIONS
#     -h, --help
#         Display help message and exit.
#
# EXAMPLES
#     Download Electron default version for all platforms:
#         $ ./download_electron.sh electron default all
#
#     Download specific Electron version for macOS Apple Silicon:
#         $ ./download_electron.sh electron 23.0.0 darwin-arm64
#
#     Use platform alias:
#         $ ./download_electron.sh electron 23.0.0 mac-arm64
#
#     Download chromedriver for all platforms:
#         $ ./download_electron.sh chromedriver default all
#
#     Download ffmpeg for Linux x64:
#         $ ./download_electron.sh ffmpeg 22.3.27 linux-x64
#
# CONFIGURATION
#     The script requires electron.json in the same directory with structure:
#
#     {
#       "default_version": "23.0.0",
#       "base_url": "https://github.com/electron/electron/releases/download",
#       "output_dir": "bin/electron-packages",
#       "platform_aliases": {
#         "mac-arm64": "darwin-arm64",
#         "mac-x64": "darwin-x64"
#       },
#       "packages": {
#         "electron": {
#           "darwin-arm64": "electron-v{version}-darwin-arm64.zip",
#           "darwin-x64": "electron-v{version}-darwin-x64.zip"
#         }
#       }
#     }
#
#     The {version} placeholder in filenames is replaced with the actual version.
#
# FILES
#     om/electron.json
#         Configuration file defining packages, versions, and platforms
#
#     bin/electron-packages/
#         Default output directory (configurable in electron.json)
#
# REQUIREMENTS
#     - bash
#     - curl or wget (for downloading files)
#
# EXIT STATUS
#     0   All downloads succeeded
#     1   One or more downloads failed, or error in arguments/configuration

set -euo pipefail

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="${SCRIPT_DIR}/electron.conf"

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

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: Configuration file not found at $CONFIG_FILE"
    exit 1
fi

# Source configuration
source "$CONFIG_FILE"

# Use default version if "default" is specified
if [[ "$VERSION_ARG" == "default" ]]; then
    VERSION="$DEFAULT_VERSION"
else
    VERSION="$VERSION_ARG"
fi

# Function to resolve platform alias
resolvePlatformAlias() {
    local input_platform="$1"
    local alias_line

    while IFS= read -r alias_line; do
        [[ -z "$alias_line" ]] && continue
        [[ "$alias_line" =~ ^[[:space:]]*# ]] && continue

        local alias="${alias_line%%:*}"
        local actual="${alias_line##*:}"

        if [[ "$alias" == "$input_platform" ]]; then
            echo "$actual"
            return
        fi
    done <<< "$PLATFORM_ALIASES"

    echo "$input_platform"
}

# Function to get available platforms for a package
getAvailablePlatforms() {
    local pkg="$1"
    local platforms=()
    local def_line

    while IFS= read -r def_line; do
        [[ -z "$def_line" ]] && continue
        [[ "$def_line" =~ ^[[:space:]]*# ]] && continue

        IFS=: read -r package platform filename <<< "$def_line"

        if [[ "$package" == "$pkg" ]]; then
            platforms+=("$platform")
        fi
    done <<< "$PACKAGE_DEFINITIONS"

    printf '%s\n' "${platforms[@]}" | sort -u
}

# Function to get filename template for package and platform
getFilenameTemplate() {
    local pkg="$1"
    local plat="$2"
    local def_line

    while IFS= read -r def_line; do
        [[ -z "$def_line" ]] && continue
        [[ "$def_line" =~ ^[[:space:]]*# ]] && continue

        IFS=: read -r package platform filename <<< "$def_line"

        if [[ "$package" == "$pkg" ]] && [[ "$platform" == "$plat" ]]; then
            echo "$filename"
            return 0
        fi
    done <<< "$PACKAGE_DEFINITIONS"

    return 1
}

# Function to check if package exists
packageExists() {
    local pkg="$1"
    local def_line

    while IFS= read -r def_line; do
        [[ -z "$def_line" ]] && continue
        [[ "$def_line" =~ ^[[:space:]]*# ]] && continue

        IFS=: read -r package platform filename <<< "$def_line"

        if [[ "$package" == "$pkg" ]]; then
            return 0
        fi
    done <<< "$PACKAGE_DEFINITIONS"

    return 1
}

# Function to get all package names
getAllPackages() {
    local packages=()
    local def_line

    while IFS= read -r def_line; do
        [[ -z "$def_line" ]] && continue
        [[ "$def_line" =~ ^[[:space:]]*# ]] && continue

        IFS=: read -r package platform filename <<< "$def_line"
        packages+=("$package")
    done <<< "$PACKAGE_DEFINITIONS"

    printf '%s\n' "${packages[@]}" | sort -u
}

# Resolve platform alias
RESOLVED_PLATFORM=$(resolvePlatformAlias "$PLATFORM")

# Check if package exists
if ! packageExists "$PACKAGE"; then
    echo "Error: Package '$PACKAGE' not found in configuration"
    echo ""
    echo "Available packages:"
    getAllPackages | sed 's/^/  - /'
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
AVAILABLE_PLATFORMS=$(getAvailablePlatforms "$PACKAGE")

# Determine which platforms to download
if [[ "$PLATFORM" == "all" ]]; then
    PLATFORMS_TO_DOWNLOAD="$AVAILABLE_PLATFORMS"
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
    FILENAME_TEMPLATE=$(getFilenameTemplate "$PACKAGE" "$plat")

    if [[ -z "$FILENAME_TEMPLATE" ]]; then
        echo "Error: No filename template found for $PACKAGE:$plat"
        ((FAILURE_COUNT++))
        continue
    fi

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
