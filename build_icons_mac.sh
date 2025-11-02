#!/bin/bash

# build_icons_mac.sh
# Generates icon.icns from existing PNG files

ICONS_DIR="build/icons"
ICONSET_DIR="icon.iconset"

# Create iconset directory
mkdir -p "$ICONSET_DIR"

# Copy existing files to iconset with correct naming
cp "$ICONS_DIR/icon_16x16.png" "$ICONSET_DIR/icon_16x16.png"
cp "$ICONS_DIR/icon_16x16@2x@2x.png" "$ICONSET_DIR/icon_16x16@2x.png"
cp "$ICONS_DIR/icon_32x32.png" "$ICONSET_DIR/icon_32x32.png"
cp "$ICONS_DIR/icon_32x32@2x@2x.png" "$ICONSET_DIR/icon_32x32@2x.png"
cp "$ICONS_DIR/icon_128x128.png" "$ICONSET_DIR/icon_128x128.png"
cp "$ICONS_DIR/icon_128x128@2x@2x.png" "$ICONSET_DIR/icon_128x128@2x.png"
cp "$ICONS_DIR/icon_256x256.png" "$ICONSET_DIR/icon_256x256.png"
cp "$ICONS_DIR/icon_256x256@2x@2x.png" "$ICONSET_DIR/icon_256x256@2x.png"
cp "$ICONS_DIR/icon_512x512.png" "$ICONSET_DIR/icon_512x512.png"
cp "$ICONS_DIR/icon_512x512@2x@2x.png" "$ICONSET_DIR/icon_512x512@2x.png"

# Generate icns file
iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns"

# Clean up
rm -rf "$ICONSET_DIR"

echo "Generated $ICONS_DIR/icon.icns"
