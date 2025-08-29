#!/usr/bin/env bash
set -euo pipefail

# Usage info
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo "Download the Bun binary to a specified directory for a specific OS."
    echo ""
    echo "Options:"
    echo "  -d, --dir DIR       Directory to download the binary to (default: current directory)"
    echo "  -o, --os OS         Target OS (options: macos-arm, macos-x64, linux-x64, linux-arm,"
    echo "                      linux-x64-baseline, windows-x64)"
    echo "  -h, --help          Show this help message"
    echo ""
    echo "If no OS is specified, it will be auto-detected from your system."
    exit 1
}

# Default values
DOWNLOAD_DIR="$(pwd)"
AUTO_DETECT=true

# Parse arguments
while [[ "$#" -gt 0 ]]; do
    case $1 in
        -d|--dir) DOWNLOAD_DIR="$2"; shift ;;
        -o|--os) TARGET_OS="$2"; AUTO_DETECT=false; shift ;;
        -h|--help) show_usage ;;
        *) echo "Unknown parameter: $1"; show_usage ;;
    esac
    shift
done

if [[ "$AUTO_DETECT" = true ]]; then
    platform=$(uname -ms)

    case $platform in
    'Darwin x86_64')
        target=darwin-x64
        ;;
    'Darwin arm64')
        target=darwin-aarch64
        ;;
    'Linux aarch64' | 'Linux arm64')
        target=linux-aarch64
        ;;
    'MINGW64'*)
        target=windows-x64
        ;;
    'Linux x86_64' | *)
        target=linux-x64
        ;;
    esac

    case "$target" in
    'linux'*)
        if [ -f /etc/alpine-release ]; then
            target="$target-musl"
        fi
        ;;
    esac

    if [[ $target = darwin-x64 ]]; then
        # Is this process running in Rosetta?
        if [[ $(sysctl -n sysctl.proc_translated 2>/dev/null) = 1 ]]; then
            target=darwin-aarch64
            echo "Your shell is running in Rosetta 2. Downloading bun for $target instead"
        fi
    fi

    # Check for AVX2 support
    case "$target" in
    'darwin-x64'*)
        if [[ $(sysctl -a | grep machdep.cpu | grep AVX2) == '' ]]; then
            target="$target-baseline"
        fi
        ;;
    'linux-x64'*)
        if [[ $(cat /proc/cpuinfo 2>/dev/null | grep avx2) = '' ]]; then
            target="$target-baseline"
        fi
        ;;
    esac
else
    # Map user-friendly names to actual target names
    case "${TARGET_OS}" in
        macos-arm|darwin-arm|mac-arm)
            target=darwin-aarch64
            ;;
        macos-x64|darwin-x64|mac-x64)
            target=darwin-x64
            ;;
        macos-x64-baseline|darwin-x64-baseline|mac-x64-baseline)
            target=darwin-x64-baseline
            ;;
        linux-x64)
            target=linux-x64
            ;;
        linux-x64-baseline)
            target=linux-x64-baseline
            ;;
        linux-arm|linux-arm64|linux-aarch64)
            target=linux-aarch64
            ;;
        linux-musl|linux-x64-musl)
            target=linux-x64-musl
            ;;
        linux-arm-musl|linux-arm64-musl|linux-aarch64-musl)
            target=linux-aarch64-musl
            ;;
        windows|windows-x64|win-x64)
            target=windows-x64
            ;;
        *)
            echo "Invalid OS specified: ${TARGET_OS}"
            echo "Valid options are: macos-arm, macos-x64, macos-x64-baseline, linux-x64,"
            echo "linux-x64-baseline, linux-arm, linux-musl, linux-arm-musl, windows-x64"
            exit 1
            ;;
    esac
fi

GITHUB=${GITHUB-"https://github.com"}
github_repo="$GITHUB/oven-sh/bun"
bun_uri=$github_repo/releases/latest/download/bun-$target.zip

echo "Downloading Bun for $target to $DOWNLOAD_DIR"

# Create directory if it doesn't exist
mkdir -p "$DOWNLOAD_DIR" || { echo "Failed to create directory $DOWNLOAD_DIR"; exit 1; }

# Download and extract
temp_zip="$DOWNLOAD_DIR/bun-temp.zip"

# Clean up function to ensure zip file is removed even if script exits prematurely
cleanup() {
    rm -f "$temp_zip"
    if [[ -d "$DOWNLOAD_DIR/bun-$target" ]]; then
        rm -rf "$DOWNLOAD_DIR/bun-$target"
    fi
}

# Set trap to clean up on exit or if script is interrupted
trap cleanup EXIT INT TERM

curl --fail --location --progress-bar --output "$temp_zip" "$bun_uri" ||
    { echo "Failed to download bun from $bun_uri"; exit 1; }

unzip -oqd "$DOWNLOAD_DIR" "$temp_zip" ||
    { echo "Failed to extract bun"; exit 1; }

# Move binary to the target directory
if [[ -d "$DOWNLOAD_DIR/bun-$target" ]]; then
    # For Windows, the executable is named bun.exe
    if [[ "$target" == *windows* ]]; then
        if [[ -f "$DOWNLOAD_DIR/bun-$target/bun.exe" ]]; then
            mv "$DOWNLOAD_DIR/bun-$target/bun.exe" "$DOWNLOAD_DIR/" ||
                { echo "Failed to move bun.exe binary"; exit 1; }
            echo "Bun binary successfully downloaded to $DOWNLOAD_DIR/bun.exe"
        else
            echo "Warning: Couldn't find the 'bun.exe' binary after extraction."
            echo "Please check the contents of $DOWNLOAD_DIR/bun-$target"
            ls -la "$DOWNLOAD_DIR/bun-$target"
        fi
    else
        # For Unix systems
        if [[ -f "$DOWNLOAD_DIR/bun-$target/bun" ]]; then
            mv "$DOWNLOAD_DIR/bun-$target/bun" "$DOWNLOAD_DIR/" ||
                { echo "Failed to move bun binary"; exit 1; }

            # Make executable
            chmod +x "$DOWNLOAD_DIR/bun" ||
                { echo "Failed to set permissions on bun executable"; exit 1; }
            echo "Bun binary successfully downloaded to $DOWNLOAD_DIR/bun"
        else
            echo "Warning: Couldn't find the 'bun' binary after extraction."
            echo "Please check the contents of $DOWNLOAD_DIR/bun-$target"
            ls -la "$DOWNLOAD_DIR/bun-$target"
        fi
    fi
else
    echo "Warning: Expected directory structure not found in the zip file."
    echo "The binary may have been extracted directly to $DOWNLOAD_DIR"
fi
