Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\hp\.gemini\antigravity-ide\brain\afe6591b-02cd-4115-963a-297616835f8d\.user_uploaded\media_1792474123197.png"
$destIco = "c:\Users\hp\Desktop\Hetex_Courier\favicon.ico"
$destPng = "c:\Users\hp\Desktop\Hetex_Courier\favicon.png"

$srcBmp = [System.Drawing.Bitmap]::FromFile($srcPath)
Write-Output ("Loaded source image: " + $srcBmp.Width + "x" + $srcBmp.Height)

# Create a square 64x64 and 32x32 canvas with the image centered nicely
function CreateSquareIcon($source, [int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Scale aspect fit
    $scale = [Math]::Min($size / $source.Width, $size / $source.Height) * 0.92
    $w = [int]($source.Width * $scale)
    $h = [int]($source.Height * $scale)
    $x = [int](($size - $w) / 2)
    $y = [int](($size - $h) / 2)

    $g.DrawImage($source, $x, $y, $w, $h)
    $g.Dispose()
    return $bmp
}

$bmp64 = CreateSquareIcon $srcBmp 64
$bmp32 = CreateSquareIcon $srcBmp 32
$bmp16 = CreateSquareIcon $srcBmp 16

# Save PNG
$bmp64.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)
Write-Output "Saved favicon.png (64x64)"

# Save multi-res ICO using raw PNG streams
$sizes = @(16, 32, 64)
$bmps = @($bmp16, $bmp32, $bmp64)
$pngBytesList = @()

for ($i = 0; $i -lt $bmps.Length; $i++) {
    $ms = New-Object System.IO.MemoryStream
    $bmps[$i].Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $pngBytesList += ,$ms.ToArray()
    $ms.Dispose()
}

$fs = [System.IO.File]::Create($destIco)
$bw = New-Object System.IO.BinaryWriter $fs

# ICONDIR
$bw.Write([uint16]0) # Reserved
$bw.Write([uint16]1) # Icon type
$bw.Write([uint16]$sizes.Length) # Count

# Header + Entries offset
$offset = 6 + ($sizes.Length * 16)

# ICONDIRENTRY for each
for ($i = 0; $i -lt $sizes.Length; $i++) {
    $s = $sizes[$i]
    $dataLen = $pngBytesList[$i].Length
    $bw.Write([byte]($s -band 0xFF)) # Width
    $bw.Write([byte]($s -band 0xFF)) # Height
    $bw.Write([byte]0) # Colors
    $bw.Write([byte]0) # Reserved
    $bw.Write([uint16]1) # Planes
    $bw.Write([uint16]32) # BPP
    $bw.Write([uint32]$dataLen) # Bytes in resource
    $bw.Write([uint32]$offset) # Image offset
    $offset += $dataLen
}

# Write PNG bytes
for ($i = 0; $i -lt $sizes.Length; $i++) {
    $bw.Write($pngBytesList[$i])
}

$bw.Flush()
$bw.Dispose()
$fs.Dispose()

$srcBmp.Dispose()
$bmp64.Dispose()
$bmp32.Dispose()
$bmp16.Dispose()

Write-Output "Successfully generated favicon.ico with 16x16, 32x32, 64x64 embedded PNG icons!"
