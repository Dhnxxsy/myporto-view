param(
  [string]$Root = "Assets",
  [int]$Quality = 82
)

# This script uses Squoosh CLI via npx to create .webp alongside existing images.
# Requires Node.js and internet access to download the package.
# It creates WebP files only if they don't already exist or if source is newer.

function Get-NpxCommand {
  # Prefer explicit Windows shim if available
  $paths = @('npx', 'npx.cmd', "${env:APPDATA}\\npm\\npx.cmd", "${env:ProgramFiles}\\nodejs\\npx.cmd")
  foreach($p in $paths){
    try {
      $v = & $p -v 2>$null
      if($LASTEXITCODE -eq 0 -and $v){ return $p }
    } catch { }
  }
  return $null
}

${npxCmd} = Get-NpxCommand
if(-not $npxCmd){
  Write-Error "npx not available. Please install Node.js (https://nodejs.org) and reopen PowerShell before running this script."
  exit 1
}

# Gather image files
$files = Get-ChildItem -Path $Root -Recurse -File -Include *.png,*.jpg,*.jpeg
if(-not $files){ Write-Host "No images found under $Root."; exit 0 }

foreach($f in $files){
  $outDir = Split-Path -Parent $f.FullName
  $webpPath = [System.IO.Path]::ChangeExtension($f.FullName, '.webp')

  $needs = $true
  if(Test-Path $webpPath){
    $srcTime = (Get-Item $f.FullName).LastWriteTimeUtc
    $dstTime = (Get-Item $webpPath).LastWriteTimeUtc
    if($dstTime -ge $srcTime){ $needs = $false }
  }
  if(-not $needs){
    Write-Host "Skip (up-to-date): $($f.FullName)"
    continue
  }

  Write-Host "Converting -> WebP: $($f.FullName)"
  # Build JSON options robustly
  $webpOptions = (@{ quality = $Quality } | ConvertTo-Json -Compress)
  $args = @('--yes', '@squoosh/cli', '--webp', $webpOptions, '-d', $outDir, $f.FullName)
  & $npxCmd @args
  if($LASTEXITCODE -ne 0){
    Write-Warning "Squoosh failed for: $($f.FullName) (exit $LASTEXITCODE)"
  }
}

Write-Host "Done. WebP files created alongside originals."
