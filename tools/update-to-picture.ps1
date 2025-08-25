param(
  [string]$IndexPath = "index.html"
)

# Load HTML
if(!(Test-Path $IndexPath)){ Write-Error "Not found: $IndexPath"; exit 1 }
$html = Get-Content $IndexPath -Raw

# Replace <img ...src="path.ext" ...> with <picture> + webp <source> if corresponding .webp exists
$imgPattern = '<img\b([^>]*?)\bsrc\s*=\s*"([^"]+)"([^>]*)>'

$updated = [System.Text.RegularExpressions.Regex]::Replace($html, $imgPattern, {
  param($m)
  $preAttrs = $m.Groups[1].Value
  $src = $m.Groups[2].Value
  $postAttrs = $m.Groups[3].Value
  
  # compute webp path next to source
  $srcPath = $src -replace '^\./',''
  $fsPath = Join-Path -Path (Get-Location) -ChildPath $srcPath
  $webpFsPath = [System.IO.Path]::ChangeExtension($fsPath, '.webp')
  if(!(Test-Path $webpFsPath)){
    return $m.Value # keep original <img>
  }
  
  $webpRel = [System.IO.Path]::ChangeExtension($src, '.webp') -replace '\\','/'
  
  # Keep original attributes; ensure img remains last child (use format strings to avoid quoting issues)
  $imgTag = ('<img{0} src="{1}"{2}>' -f $preAttrs, $src, $postAttrs)
  $picture = ('<picture><source type="image/webp" srcset="{0}" />{1}</picture>' -f $webpRel, $imgTag)
  return $picture
})

if($updated -ne $html){
  Set-Content -Path $IndexPath -Value $updated -Encoding UTF8
  Write-Host "Updated $IndexPath to use <picture> with WebP sources when available."
} else {
  Write-Host "No <picture> updates were applied (no matching .webp present)."
}
