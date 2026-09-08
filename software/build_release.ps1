$ErrorActionPreference = "Stop"

$softwareRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $softwareRoot
$python = Join-Path $softwareRoot ".build-venv\Scripts\python.exe"
$version = if ($env:GD_RELEASE_VERSION) { $env:GD_RELEASE_VERSION } else { Get-Date -Format "yyyy.MM.dd.HHmm" }
$releaseNotes = if ($env:GD_RELEASE_NOTES) { $env:GD_RELEASE_NOTES } else { "Atualização do aplicativo GameDoctor." }

if (-not (Test-Path $python)) {
  python -m venv (Join-Path $softwareRoot ".build-venv")
}

& $python -m pip install --disable-pip-version-check -r (Join-Path $softwareRoot "build-requirements.txt")
Push-Location $softwareRoot
try {
  Remove-Item -Recurse -Force -ErrorAction SilentlyContinue build, dist
  & $python -m PyInstaller --noconfirm --clean --windowed --name GameDoctor --icon gamedoctor.ico `
    --add-data "ui;ui" --add-data "boardview_feature;boardview_feature" `
    --collect-all PyQt6 --collect-all PyQt6.QtWebEngineCore --collect-all PyQt6.QtWebEngineWidgets main.py
} finally {
  Pop-Location
}

$releaseDir = Join-Path $softwareRoot "release"
New-Item -ItemType Directory -Force $releaseDir | Out-Null
$archive = Join-Path $releaseDir "GameDoctor-$version-windows.zip"
Remove-Item -Force -ErrorAction SilentlyContinue $archive
Compress-Archive -Path (Join-Path $softwareRoot "dist\GameDoctor\*") -DestinationPath $archive

$env:SOFTWARE_RELEASE_FILE = $archive
$env:SOFTWARE_RELEASE_VERSION = $version
$env:SOFTWARE_RELEASE_NOTES = $releaseNotes
Push-Location $projectRoot
try {
  npm run software:publish
  if ($LASTEXITCODE -ne 0) { throw "A publicação da versão falhou (código $LASTEXITCODE)." }
} finally {
  Pop-Location
}

Write-Host "Build e publicação concluídos: $archive"
