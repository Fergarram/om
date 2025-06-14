xcopy "node_modules\electron\dist" "builds\windows" /E /I /H /K
ren "builds\windows\electron.exe" "om.exe"
cd builds\windows
mklink /D system "..\..\system"
mklink /D user "..\..\user"
