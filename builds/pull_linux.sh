#!/bin/bash

# Copy Electron distribution
cp -r node_modules/electron/dist builds/linux/

# Rename electron binary
mv "builds/linux/electron" "builds/linux/om"

# Change to builds/linux directory
cd builds/linux

# Create symbolic links
ln -s ../../sys sys
ln -s ../../user user
