cp -r node_modules/electron/dist/Electron.app/ build/Om.app/
cp build/icons/icon.icns build/Om.app/Contents/Resources/icon.icns
cp build/Info.plist build/Om.app/Contents/Info.plist
bun pack_mac
