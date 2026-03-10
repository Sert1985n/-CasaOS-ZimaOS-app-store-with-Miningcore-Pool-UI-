# Download crypto icons from spothq/cryptocurrency-icons (CC0, local use)
# Run: .\download-icons.ps1
$base = "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color"
$out = "$PSScriptRoot\assets\icons"
$coins = @("btc","bch","bsv","dgb","doge","xec","ppc","rvn","vtc","ltc","grs","xmr","erg","etc","eth","zec","zen","flux","firo","kas")
foreach ($c in $coins) {
  $url = "$base/$c.png"
  try {
    Invoke-WebRequest -Uri $url -OutFile "$out\$c.png" -UseBasicParsing
    Write-Host "OK $c"
  } catch {
    Write-Host "skip $c"
  }
}
# Aliases for coins not in pack (copy from similar coin)
@("bc2","bch2","xna","fb","ethw","zeph","space","xel","octa","nexa","btcs","xec","erg","firo","kas") | ForEach-Object {
  $c = $_
  $src = switch ($c) {
    "bc2" { "btc" }
    "bch2" { "bch" }
    "xna" { "btc" }
    "fb"  { "btc" }
    "ethw"{ "eth" }
    "zeph"{ "xmr" }
    "space"{ "btc" }
    "xel" { "eth" }
    "octa"{ "eth" }
    "nexa"{ "btc" }
    "btcs"{ "btc" }
    "xec" { "bch" }
    "erg" { "eth" }
    "firo"{ "flux" }
    "kas" { "eth" }
    default { "btc" }
  }
  $sp = "$out\$src.png"
  if (Test-Path $sp) { Copy-Item $sp "$out\$c.png" -Force; Write-Host "alias $c <- $src" }
}
Write-Host "Done. Icons in $out"
