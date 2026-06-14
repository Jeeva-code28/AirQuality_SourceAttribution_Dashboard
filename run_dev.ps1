$NodeDir = "$PSScriptRoot\frontend\frontend-tools\node"
$env:Path = "$NodeDir;" + $env:Path
cd frontend
& "$NodeDir\npm.cmd" run dev
cd ..
