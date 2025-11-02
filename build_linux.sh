#!/bin/bash

# NAME
#     build_linux.sh - Download and extract Electron binaries for Linux

# SYNOPSIS
#     build_linux.sh [OPTIONS]

# DESCRIPTION
#     Downloads Electron binaries for the detected Linux architecture,
#     extracts them, and creates an application directory structure.
#     Optionally renames the executable.
#
#     The script automatically detects your Linux architecture (ARM64 or x64)
#     and downloads only the matching Electron build.
#
#     After extraction and renaming, the script customizes the installation:
#     - Renames electron executable to specified name (default: om)
#     - Copies om-repack script to the application directory
#     - Runs pack.js to create custom default_app.asar
#     - Replaces the default_app.asar in the resources directory

# OPTIONS
#     -v VERSION
#         Specify Electron version to download. Use "default" or omit to
#         use the version specified in electron.conf.

#     -o OUTPUT_DIR
#         Specify output directory for final application. Default is
#         bin relative to the script location.

#     -n NAME
#         Specify app name. Default is "om". This renames the
#         electron executable.

#     -h
#         Display help message and exit.

# EXAMPLES
#     Basic usage with default version and name:
#         $ cd om
#         $ ./build_linux.sh

#     This downloads Electron (version from electron.conf) for your
#     architecture, extracts it, and creates om application in ./bin/

#     Use specific version:
#         $ ./build_linux.sh -v 23.0.0

#     Downloads and extracts Electron v23.0.0 for your architecture.

#     Custom app name:
#         $ ./build_linux.sh -n myapp

#     Creates myapp executable instead of om.

#     Custom output directory:
#         $ ./build_linux.sh -o ./dist

#     Places final application in ./dist/ instead of ./bin/

#     All options combined:
#         $ ./build_linux.sh -v 22.3.27 -n myapp -o ~/apps

# WHAT IT DOES
#     1. Detects your Linux architecture (ARM64 or x64)

#     2. Downloads electron package for your architecture if not present:
#        - linux-arm64 (ARM64)
#        - linux-x64 (x64)

#     3. Extracts the zip file if not already extracted

#     4. Creates output directory structure

#     5. Copies all Electron files to output directory

#     6. Renames the executable from electron to specified name (default: om)

#     7. Copies om-repack script and makes it executable

#     8. Runs pack.js using the renamed executable to create custom default_app.asar

#     9. Replaces default_app.asar in the resources directory

# FILES
#     om/download_electron.sh
#         Required download script

#     om/electron.conf
#         Configuration file with versions and package definitions

#     build/linux/om-repack.sh
#         Repack script to copy to application directory

#     build/pack.js
#         Script to create default_app.asar

#     build/default_app.asar
#         Generated asar archive (temporary)

#     bin/electron-packages/electron/{version}/
#         Location of downloaded and extracted files

#     bin/om/
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
APP_NAME="om"

function usage() {
    cat << EOF
Usage: $(basename "$0") [OPTIONS]

Download and extract Electron binaries for your Linux architecture

OPTIONS:
    -v VERSION      Electron version (default: from config)
    -o OUTPUT_DIR   Output directory for final application (default: bin)
    -n NAME         App name (default: om)
    -h              Show this help message

EXAMPLES:
    $(basename "$0")                    # Use default version and name (om)
    $(basename "$0") -v 23.0.0          # Use specific version
    $(basename "$0") -n myapp           # Create myapp executable
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
    aarch64)
        platform="linux-arm64"
        ;;
    x86_64)
        platform="linux-x64"
        ;;
    armv7l)
        platform="linux-armv7l"
        ;;
    *)
        echo "Error: Unknown architecture: $current_arch"
        exit 1
        ;;
esac

echo "========================================="
echo "Building Electron for Linux"
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

# Check if extracted directory already exists
extracted_dir="${electron_dir}/electron-v${actual_version}-${platform}"

if [[ -d "$extracted_dir" ]]; then
    echo "Electron already extracted"
    echo "Skipping extraction"
else
    echo "========================================="
    echo "Extracting archive"
    echo "========================================="

    if [[ -f "$zip_file" ]]; then
        echo "Extracting: $zip_file"
        echo "  to: $extracted_dir/"
        mkdir -p "$extracted_dir"
        unzip -q "$zip_file" -d "$extracted_dir"
        echo "  Done!"
    else
        echo "Error: Zip file not found: $zip_file"
        exit 1
    fi
fi

echo ""
echo "========================================="
echo "Copying and setting up application"
echo "========================================="

# Verify extracted directory exists
if [[ ! -d "$extracted_dir" ]]; then
    echo "Error: Extracted directory not found at $extracted_dir"
    echo "Extraction may have failed"
    exit 1
fi

# Create output directory (use bin instead of the packages dir)
FINAL_OUTPUT_DIR="${SCRIPT_DIR}/bin/${APP_NAME}"
mkdir -p "$FINAL_OUTPUT_DIR"

# Remove existing app if present
if [[ -d "$FINAL_OUTPUT_DIR" ]]; then
    echo "Removing existing ${APP_NAME} from output directory"
    rm -rf "$FINAL_OUTPUT_DIR"
    mkdir -p "$FINAL_OUTPUT_DIR"
fi

# Copy all Electron files to output directory
echo "Copying Electron files to ${APP_NAME}"
echo "  from: $extracted_dir"
echo "  to: $FINAL_OUTPUT_DIR"
cp -R "$extracted_dir"/* "$FINAL_OUTPUT_DIR/"

# Rename electron executable
electron_executable="${FINAL_OUTPUT_DIR}/electron"
renamed_executable="${FINAL_OUTPUT_DIR}/${APP_NAME}"

if [[ -f "$electron_executable" ]]; then
    echo "Renaming executable: electron -> ${APP_NAME}"
    mv "$electron_executable" "$renamed_executable"
    chmod +x "$renamed_executable"
else
    echo "Warning: electron executable not found at $electron_executable"
fi

echo ""
echo "========================================="
echo "Customizing application"
echo "========================================="

# Copy om-repack script
repack_source="${SCRIPT_DIR}/build/linux/om-repack.sh"
repack_dest="${FINAL_OUTPUT_DIR}/om-repack"

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

echo ""
echo "========================================="
echo "Building custom default_app.asar"
echo "========================================="

pack_script="${SCRIPT_DIR}/build/pack.js"
build_dir="${SCRIPT_DIR}/build"
generated_asar="${build_dir}/default_app.asar"
app_resources_dir="${FINAL_OUTPUT_DIR}/resources"
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

ELECTRON_RUN_AS_NODE=1 "$renamed_executable" "$pack_script"

# Check if asar was created successfully
if [[ ! -f "$generated_asar" ]]; then
    echo "Error: default_app.asar was not created at $generated_asar"
    exit 1
fi

echo ""
echo "Replacing default_app.asar in application"
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
echo "${APP_NAME} location: $FINAL_OUTPUT_DIR"
echo "Executable: $renamed_executable"
echo "Source files preserved: $electron_dir"
echo "========================================="
