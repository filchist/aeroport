Add-Type -AssemblyName System.Drawing

$src = $env:HERO_SRC
if (-not $src) { throw "Укажите HERO_SRC — папку с исходными PNG 800x1200" }
$dst = if ($env:HERO_DST) { $env:HERO_DST } else { Join-Path $PSScriptRoot "..\assets\heroes" }
if (-not (Test-Path -LiteralPath $dst)) { New-Item -ItemType Directory -Path $dst | Out-Null }

$map = [ordered]@{
  "01_Mel_Bakersfeld.png"          = "mel-bakersfeld"
  "02_Tanya_Livingston.png"        = "tanya-livingston"
  "03_Vernon_Demarest.png"         = "demerest"
  "04_Joe_Patroni.png"             = "patroni"
  "05_Keith_Bakersfeld.png"        = "keith-bakersfeld"
  "06_Gwen_Meighen.png"            = "gwen-meighen"
  "07_Cindy_Bakersfeld.png"        = "cindy-bakersfeld"
  "08_Danny_Farrow.png"            = "danny-farrow"
  "09_Ingram.png"                  = "ingram"
  "10_Lieutenant_Ned_Ordway.png"   = "ned-ordway"
  "11_DO_Guerrero.png"             = "guerrero"
  "12_Ines_Guerrero.png"           = "inez-guerrero"
  "13_Ada_Kwonski.png"             = "ada-quonsett"
  "14_Marcus_Rasbone.png"          = "marcus-rathbone"
  "15_Elliot_Fremantle.png"        = "elliot-fremantle"
  "16_Patsy_Smith.png"             = "patsy-smith"
  "17_Will.png"                    = "will"
  "18_Press_and_Television.png"    = "press-tv"
}

$w = 520
$h = 634
$cropH = 975
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters(1)
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, [long]84)

$total = 0
foreach ($k in $map.Keys) {
  $in = Join-Path $src $k
  $out = Join-Path $dst ($map[$k] + ".jpg")
  $img = [System.Drawing.Image]::FromFile($in)
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
  $srcRect = New-Object System.Drawing.Rectangle(0, 0, $img.Width, $cropH)
  $dstRect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
  $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $bmp.Save($out, $codec, $ep)
  $bmp.Dispose()
  $img.Dispose()
  $size = (Get-Item -LiteralPath $out).Length
  $total += $size
  "{0,-18} {1,7} KB" -f $map[$k], ([int]($size/1KB))
}
"TOTAL: {0:N0} KB" -f ($total/1KB)

