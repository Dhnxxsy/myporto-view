param(
  [string]$IndexPath = "index.html",
  [string]$DimensionsPath = "tools/dimensions.json"
)

if(!(Test-Path $DimensionsPath)){
  Write-Error "Dimensions JSON not found at $DimensionsPath. Run tools/get-image-dimensions.ps1 first."
  exit 1
}

# Load dimensions
$map = @{}
$items = Get-Content $DimensionsPath -Raw | ConvertFrom-Json
foreach($it in $items){
  $rel = $it.Rel
  if(-not $rel){ $rel = $it.Path }
  $norm = ($rel -replace "^\.[\\/]+","") -replace "\\","/"
  $map[$norm] = @{ w = [int]$it.Width; h = [int]$it.Height }
}

# Load HTML
$html = Get-Content $IndexPath -Raw

# Regex to match img tags and capture src
$imgPattern = '<img\b[^>]*?src\s*=\s*"([^"]+)"[^>]*>'

$updated = [System.Text.RegularExpressions.Regex]::Replace($html, $imgPattern, {
  param($m)
  $full = $m.Value
  $src  = $m.Groups[1].Value
  $srcNorm = ($src -replace '^\./','') -replace '\\','/'

  # Lookup
  $dim = $map[$srcNorm]
  if(-not $dim){ return $full }

  # width/height exist?
  $hasW = $full -match 'width\s*=\s*"\d+"'
  $hasH = $full -match 'height\s*=\s*"\d+"'

  $newTag = $full
  if($hasW){
    $newTag = [Regex]::Replace($newTag, 'width\s*=\s*"\d+"', "width=\"$($dim.w)\"")
  } else {
    $newTag = $newTag -replace '\s*/?>$', " width=\"$($dim.w)\"$0"
  }
  if($hasH){
    $newTag = [Regex]::Replace($newTag, 'height\s*=\s*"\d+"', "height=\"$($dim.h)\"")
  } else {
    $newTag = $newTag -replace '\s*/?>$', " height=\"$($dim.h)\"$0"
  }
  return $newTag
})

if($updated -ne $html){
  Set-Content -Path $IndexPath -Value $updated -Encoding UTF8
  Write-Host "Updated width/height on <img> in $IndexPath"
} else {
  Write-Host "No changes needed for $IndexPath"
}
