xcopy "node_modules\electron\dist" "build\windows" /E /I /H /K
ren "build\windows\electron.exe" "om.exe"
cd build\windows
mklink /D system "..\..\system"
mklink /D user "..\..\user"
