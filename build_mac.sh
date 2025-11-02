#!/bin/bash

# NAME
#     build_mac.sh - Download and extract Electron binaries for macOS

# SYNOPSIS
#     build_mac.sh [OPTIONS]

# DESCRIPTION
#     Downloads Electron binaries for the detected macOS architecture,
#     extracts them, and copies the Electron.app to the bin directory.
#     Optionally renames the app bundle and executable.
#
#     The script automatically detects your Mac architecture (Apple Silicon
#     or Intel) and downloads only the matching Electron.app build.
#
#     After extraction and renaming, the script customizes the app bundle:
#     - Copies custom Info.plist from build/mac/
#     - Copies om-repack script to Contents/MacOS/
#     - Replaces default icon with custom icon from build/icons/
#     - Runs pack.js to create custom default_app.asar
#     - Replaces the default_app.asar in the app bundle

# OPTIONS
#     -v VERSION
#         Specify Electron version to download. Use "default" or omit to
#         use the version specified in electron.conf.

#     -o OUTPUT_DIR
#         Specify output directory for final app bundle. Default is
#         bin relative to the script location.

#     -n NAME
#         Specify app name. Default is "Om". This renames both the
#         .app bundle and the executable inside Contents/MacOS/.

#     -h
#         Display help message and exit.

# EXAMPLES
#     Basic usage with default version and name:
#         $ cd om
#         $ ./build_mac.sh

#     This downloads Electron (version from electron.conf) for your
#     architecture, extracts it, and copies it as Om.app to ./bin/

#     Use specific version:
#         $ ./build_mac.sh -v 23.0.0

#     Downloads and extracts Electron v23.0.0 for your architecture.

#     Custom app name:
#         $ ./build_mac.sh -n MyApp

#     Creates MyApp.app instead of Om.app and renames the executable.

#     Custom output directory:
#         $ ./build_mac.sh -o ./dist

#     Places final app bundle in ./dist/ instead of ./bin/

#     All options combined:
#         $ ./build_mac.sh -v 22.3.27 -n MyApp -o ~/Applications

# WHAT IT DOES
#     1. Detects your Mac's architecture (Apple Silicon or Intel)

#     2. Downloads electron package for your architecture if not present:
#        - darwin-arm64 (Apple Silicon)
#        - darwin-x64 (Intel)

#     3. Extracts the zip file if not already extracted

#     4. Copies Electron.app to output directory as Name.app (default: Om.app)

#     5. Renames the executable from Electron to Name (default: Om)

#     6. Copies custom Info.plist from build/mac/

#     7. Copies om-repack script to Contents/MacOS/ and makes it executable

#     8. Replaces default icon with custom icon from build/icons/

#     9. Runs pack.js using the Om executable to create custom default_app.asar

#     10. Replaces default_app.asar in the app bundle

# FILES
#     om/download_electron.sh
#         Required download script

#     om/electron.conf
#         Configuration file with versions and package definitions

#     build/mac/Info.plist
#         Custom Info.plist to replace default

#     build/mac/om-repack.sh
#         Repack script to copy to app bundle

#     build/icons/icon.icns
#         Custom icon to replace default electron.icns

#     build/pack.js
#         Script to create default_app.asar

#     build/default_app.asar
#         Generated asar archive (temporary)

#     bin/electron-packages/electron/{version}/
#         Location of downloaded and extracted files

#     bin/Om.app
#         Final output location (default)

# REQUIREMENTS
#     - bash
#     - unzip (for archive extraction)
#     - curl or wget (for downloading)

# EXIT STATUS
#     0   Success
#     1   Error occurred

# SEE ALSO
#     download_electron.sh(1)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOWNLOAD_SCRIPT="${SCRIPT_DIR}/download_electron.sh"
CONFIG_FILE="${SCRIPT_DIR}/electron.conf"
OUTPUT_DIR="${SCRIPT_DIR}/bin"
APP_NAME="Om"

function usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Download and extract Electron binaries for your macOS architecture

OPTIONS:
    -v VERSION      Electron version (default: from config)
    -o OUTPUT_DIR   Output directory for final app bundle (default: bin)
    -n NAME         App name (default: Om)
    -h              Show this help message

EXAMPLES:
    $(basename "$0")                    # Use default version and name (Om.app)
    $(basename "$0") -v 23.0.0          # Use specific version
    $(basename "$0") -n MyApp           # Create MyApp.app
    $(basename "$0") -o ./dist          # Custom output directory

EOF
    exit 1
}

# Parse arguments
version="default"
while getopts "v:o:n:h" opt; do
    case $opt in
        v) version="$OPTARG" ;;
        o) OUTPUT_DIR="$OPTARG" ;;
        n) APP_NAME="$OPTARG" ;;
        h) usage ;;
        *) usage ;;
    esac
done

# Check if download script exists
if [[ ! -f "$DOWNLOAD_SCRIPT" ]]; then
    echo "Error: Download script not found at $DOWNLOAD_SCRIPT"
    exit 1
fi

# Check if config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
    echo "Error: Config file not found at $CONFIG_FILE"
    exit 1
fi

# Check if unzip is installed
if ! command -v unzip &> /dev/null; then
    echo "Error: unzip is required but not installed"
    exit 1
fi

# Source configuration to get variables
source "$CONFIG_FILE"

# Detect current platform
current_arch="$(uname -m)"
case "$current_arch" in
    arm64|aarch64)
        platform="darwin-arm64"
        ;;
    x86_64)
        platform="darwin-x64"
        ;;
    *)
        echo "Error: Unknown architecture: $current_arch"
        exit 1
        ;;
esac

echo "========================================="
echo "Building Electron for macOS"
echo "========================================="
echo "Version: $version"
echo "App name: $APP_NAME"
echo "Detected architecture: $current_arch"
echo "Platform: $platform"
echo ""

# Resolve version if using default
if [[ "$version" == "default" ]]; then
    actual_version="$DEFAULT_VERSION"
else
    actual_version="$version"
fi

# Use output directory from config
electron_dir="${SCRIPT_DIR}/${OUTPUT_DIR}/electron/${actual_version}"

# Check if zip file exists
zip_file="${electron_dir}/electron-v${actual_version}-${platform}.zip"

if [[ -f "$zip_file" ]]; then
    echo "Package already exists: $zip_file"
    echo "Skipping download"
else
    echo "Downloading $platform..."
    "$DOWNLOAD_SCRIPT" electron "$version" "$platform"
fi
echo ""

# Check if Electron.app already exists
electron_app="${electron_dir}/Electron.app"

if [[ -d "$electron_app" ]]; then
    echo "Electron.app already extracted"
    echo "Skipping extraction"
else
    echo "========================================="
    echo "Extracting archive"
    echo "========================================="

    if [[ -f "$zip_file" ]]; then
        extract_dir=$(dirname "$zip_file")
        echo "Extracting: $zip_file"
        echo "  to: $extract_dir/"
        unzip -q -o "$zip_file" -d "$extract_dir"
        echo "  Done!"
    else
        echo "Error: Zip file not found: $zip_file"
        exit 1
    fi
fi

echo ""
echo "========================================="
echo "Copying and renaming app bundle"
echo "========================================="

# Verify Electron.app exists
if [[ ! -d "$electron_app" ]]; then
    echo "Error: Electron.app not found at $electron_app"
    echo "Extraction may have failed"
    exit 1
fi

# Create output directory (use bin instead of the packages dir)
FINAL_OUTPUT_DIR="${SCRIPT_DIR}/bin"
mkdir -p "$FINAL_OUTPUT_DIR"

# Define final app location
final_app="${FINAL_OUTPUT_DIR}/${APP_NAME}.app"

# Remove existing app if present
if [[ -d "$final_app" ]]; then
    echo "Removing existing ${APP_NAME}.app from output directory"
    rm -rf "$final_app"
fi

# Copy Electron.app to output directory
echo "Copying Electron.app to ${APP_NAME}.app"
echo "  from: $electron_app"
echo "  to: $final_app"
cp -R "$electron_app" "$final_app"

# Rename executable inside Contents/MacOS/
electron_executable="${final_app}/Contents/MacOS/Electron"
renamed_executable="${final_app}/Contents/MacOS/${APP_NAME}"

if [[ -f "$electron_executable" ]]; then
    echo "Renaming executable: Electron -> ${APP_NAME}"
    mv "$electron_executable" "$renamed_executable"
else
    echo "Warning: Electron executable not found at $electron_executable"
fi

echo ""
echo "========================================="
echo "Customizing app bundle"
echo "========================================="

# Copy custom Info.plist
info_plist_source="${SCRIPT_DIR}/build/mac/Info.plist"
info_plist_dest="${final_app}/Contents/Info.plist"

if [[ -f "$info_plist_source" ]]; then
    echo "Copying custom Info.plist"
    echo "  from: $info_plist_source"
    echo "  to: $info_plist_dest"
    cp "$info_plist_source" "$info_plist_dest"
else
    echo "Warning: Custom Info.plist not found at $info_plist_source"
fi

# Copy om-repack script
repack_source="${SCRIPT_DIR}/build/mac/om-repack.sh"
repack_dest="${final_app}/Contents/MacOS/om-repack"

if [[ -f "$repack_source" ]]; then
    echo "Copying om-repack script"
    echo "  from: $repack_source"
    echo "  to: $repack_dest"
    cp "$repack_source" "$repack_dest"
    echo "Making om-repack executable"
    chmod +x "$repack_dest"
else
    echo "Warning: om-repack script not found at $repack_source"
fi

# Copy custom icon
icon_source="${SCRIPT_DIR}/build/icons/icon.icns"
icon_dest="${final_app}/Contents/Resources/icon.icns"

if [[ -f "$icon_source" ]]; then
    echo "Copying custom icon"
    echo "  from: $icon_source"
    echo "  to: $icon_dest"
    # Remove default electron.icns if it exists
    if [[ -f "${final_app}/Contents/Resources/electron.icns" ]]; then
        rm "${final_app}/Contents/Resources/electron.icns"
    fi
    cp "$icon_source" "$icon_dest"
else
    echo "Warning: Custom icon not found at $icon_source"
fi

echo ""
echo "========================================="
echo "Building custom default_app.asar"
echo "========================================="

pack_script="${SCRIPT_DIR}/build/pack.js"
build_dir="${SCRIPT_DIR}/build"
generated_asar="${build_dir}/default_app.asar"
app_resources_dir="${final_app}/Contents/Resources"
target_asar="${app_resources_dir}/default_app.asar"

if [[ ! -f "$pack_script" ]]; then
    echo "Error: pack.js not found at $pack_script"
    exit 1
fi

# Remove old generated asar if it exists
if [[ -f "$generated_asar" ]]; then
    echo "Removing old default_app.asar from build directory"
    rm "$generated_asar"
fi

echo "Running pack.js to create default_app.asar"
echo "  executable: $renamed_executable"
echo "  script: $pack_script"

"$renamed_executable" "$pack_script"

# Check if asar was created successfully
if [[ ! -f "$generated_asar" ]]; then
    echo "Error: default_app.asar was not created at $generated_asar"
    exit 1
fi

echo ""
echo "Replacing default_app.asar in app bundle"
echo "  from: $generated_asar"
echo "  to: $target_asar"

if [[ -f "$target_asar" ]]; then
    rm "$target_asar"
fi

cp "$generated_asar" "$target_asar"

echo "  Done!"

echo ""
echo "========================================="
echo "Build Complete!"
echo "========================================="
echo "${APP_NAME}.app location: $final_app"
echo "Source files preserved: $electron_dir"
echo "========================================="
