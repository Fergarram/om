#!/bin/bash

# Copy Electron distribution
cp -r node_modules/electron/dist build/linux/

# Rename electron binary
mv "build/linux/electron" "build/linux/om"

# Change to build/linux directory
cd build/linux

# Create symbolic links
ln -s ../../system system
ln -s ../../user user
