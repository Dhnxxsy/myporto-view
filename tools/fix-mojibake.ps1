param(
  [string]$File = "index.html",
  [switch]$UseEntities
)

if(!(Test-Path -LiteralPath $File)){
  Write-Error "Not found: $File"; exit 1
}

# Read raw content
$content = Get-Content -LiteralPath $File -Raw

# Fix common mojibake sequences
$mapUnicode = @{
  'â€”' = '—'; # em dash
  'â€“' = '–'; # en dash
  'â€¢' = '•'; # bullet
  'â€˜' = '‘'; 'â€™' = '’'; # single quotes
  'â€œ' = '“'; 'â€�' = '”'; # double quotes
  'â€¹' = '‹'; 'â€º' = '›'; # single angle quotes
  'â€‘' = '‑'; # non-breaking hyphen
}

$mapEntities = @{
  'â€”' = '&mdash;'
  'â€“' = '&ndash;'
  'â€¢' = '&bull;'
  'â€˜' = '&lsquo;'; 'â€™' = '&rsquo;'
  'â€œ' = '&ldquo;'; 'â€�' = '&rdquo;'
  'â€¹' = '&lsaquo;'; 'â€º' = '&rsaquo;'
  'â€‘' = '&#8209;'
}

# Choose mapping
$map = if($UseEntities){ $mapEntities } else { $mapUnicode }

foreach($k in $map.Keys){
  $content = $content -replace [regex]::Escape($k), $map[$k]
}

# Fix specific known phrase
if($UseEntities){
  $content = $content -replace 'sciâ€‘fi','sci&#8209;fi'
} else {
  $content = $content -replace 'sciâ€‘fi','sci‑fi'
}

# Write back as UTF-8 (no BOM preference if available)
try {
  [System.IO.File]::WriteAllText((Resolve-Path -LiteralPath $File), $content, [System.Text.UTF8Encoding]::new($false))
} catch {
  Set-Content -LiteralPath $File -Value $content -Encoding UTF8
}

# Report remaining suspicious bytes
$remain = (Select-String -Path $File -Pattern 'â' -SimpleMatch).Count
Write-Host "Fixed mojibake in $File. Remaining suspicious 'â' count: $remain"
