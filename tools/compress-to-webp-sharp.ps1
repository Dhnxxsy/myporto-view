param(
  [string]$Root = "Assets",
  [int]$Quality = 82,
  [int]$MaxWidth = 0,
  [int]$MaxHeight = 0,
  [ValidateSet('webp','png','jpeg','auto')]
  [string]$Format = 'webp',
  [switch]$Overwrite
)

# Compress images to WebP using sharp-cli via npx (works offline after first install)
# Requires Node.js and internet once to download sharp binaries

function Get-NpxCommand {
  $paths = @('npx', 'npx.cmd', "${env:APPDATA}\npm\npx.cmd", "${env:ProgramFiles}\nodejs\npx.cmd")
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
  # Tentukan format output
  $targetFormat = $Format
  if($Format -eq 'auto'){
    # Ikuti format asli file
    $ext = [System.IO.Path]::GetExtension($f.FullName).TrimStart('.').ToLowerInvariant()
    if(@('png','jpg','jpeg') -contains $ext){
      $targetFormat = if($ext -eq 'jpg'){ 'jpeg' } else { $ext }
    } else {
      $targetFormat = 'png'
    }
  }

  $outExt = ".$targetFormat"
  $outPath = [System.IO.Path]::ChangeExtension($f.FullName, $outExt)
  $needs = $true
  if((Test-Path $outPath) -and (-not $Overwrite)){
    $srcTime = (Get-Item $f.FullName).LastWriteTimeUtc
    $dstTime = (Get-Item $outPath).LastWriteTimeUtc
    if($dstTime -ge $srcTime){ $needs = $false }
  }
  if(-not $needs){
    Write-Host "Skip (up-to-date): $($f.FullName)"
    continue
  }

  Write-Host "Converting -> $targetFormat (sharp): $($f.FullName)"
  $npxArgs = @('--yes', 'sharp-cli', '--input', $f.FullName, '--output', $outPath)
  if($MaxWidth -gt 0 -or $MaxHeight -gt 0){
    $w = if($MaxWidth -gt 0){ $MaxWidth } else { $null }
    $h = if($MaxHeight -gt 0){ $MaxHeight } else { $null }
    if($w -and $h){
      $npxArgs += @('resize', "$w", "$h", '--fit', 'inside')
    } elseif($w){
      $npxArgs += @('resize', "$w", '--fit', 'inside')
    } elseif($h){
      # sharp CLI tidak menerima hanya height tanpa width, fallback: gunakan fit:inside dengan lebar besar
      $npxArgs += @('resize', "9999", "$h", '--fit', 'inside')
    }
  }
  # Format dan kualitas sesuai target
  $npxArgs += @('--format', $targetFormat)
  if($targetFormat -in @('webp','jpeg')){
    $npxArgs += @('--quality', $Quality)
  }
  & $npxCmd @npxArgs
  if($LASTEXITCODE -ne 0){
    Write-Warning "sharp-cli failed for: $($f.FullName) (exit $LASTEXITCODE)"
  }
}

Write-Host "Done. Files created alongside originals (sharp-cli)."
