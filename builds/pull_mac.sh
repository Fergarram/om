cp -r node_modules/electron/dist/Electron.app/ builds/Om.app/
cp icons/icon.icns builds/Om.app/Contents/Resources/icon.icns
bun pack_mac
