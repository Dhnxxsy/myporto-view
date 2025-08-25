param(
  [string]$Root = "Assets"
)

Add-Type -AssemblyName System.Drawing

$results = @()
Get-ChildItem -Path $Root -Recurse -File -Include *.png,*.jpg,*.jpeg | ForEach-Object {
  try {
    $img = [System.Drawing.Image]::FromFile($_.FullName)
    $results += [pscustomobject]@{
      Path   = $_.FullName
      Rel    = (Resolve-Path -Relative $_.FullName)
      Width  = $img.Width
      Height = $img.Height
    }
    $img.Dispose()
  } catch {
    Write-Warning "Failed to read image dimensions: $($_.FullName) - $($_.Exception.Message)"
  }
}

$results | ConvertTo-Json -Depth 3 | Set-Content -Encoding UTF8 (Join-Path -Path (Split-Path -Parent $PSCommandPath) -ChildPath 'dimensions.json')

Write-Host "Wrote dimensions to tools/dimensions.json"
