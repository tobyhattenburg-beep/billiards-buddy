# Billiards Buddy — Local Test Server
# Serves the project folder over HTTP so PWA / GPS / Service Worker all work.
# Usage: Right-click → "Run with PowerShell"  OR  & "C:\billliards buddy\serve.ps1"

$port = 8080
$root = $PSScriptRoot   # folder containing this script
$url  = "http://localhost:$port/billiards-buddy-v9.2-pwa.html"

$mimeMap = @{
    '.html' = 'text/html; charset=utf-8'
    '.js'   = 'application/javascript'
    '.json' = 'application/json'
    '.svg'  = 'image/svg+xml'
    '.png'  = 'image/png'
    '.ico'  = 'image/x-icon'
    '.txt'  = 'text/plain'
    '.css'  = 'text/css'
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
} catch {
    Write-Host ""
    Write-Host "  ERROR: Could not bind to port $port." -ForegroundColor Red
    Write-Host "  Another process may be using it. Close it and try again." -ForegroundColor Yellow
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "  ================================" -ForegroundColor Green
Write-Host "  Billiards Buddy - Test Server" -ForegroundColor Green
Write-Host "  Serving: $root" -ForegroundColor Cyan
Write-Host "  URL:     $url" -ForegroundColor Cyan
Write-Host "  ================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Opening browser..." -ForegroundColor Yellow
Write-Host "  Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

# Open the browser
Start-Process $url

# Serve requests until Ctrl+C
while ($listener.IsListening) {
    try {
        $ctx  = $listener.GetContext()
        $req  = $ctx.Request
        $res  = $ctx.Response

        $relPath = $req.Url.LocalPath.TrimStart('/')
        if ($relPath -eq '') { $relPath = 'billiards-buddy-v9.2-pwa.html' }
        $filePath = Join-Path $root $relPath

        if (Test-Path $filePath -PathType Leaf) {
            $ext   = [System.IO.Path]::GetExtension($filePath).ToLower()
            $mime  = if ($mimeMap[$ext]) { $mimeMap[$ext] } else { 'application/octet-stream' }
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            $res.StatusCode      = 200
            $res.ContentType     = $mime
            $res.ContentLength64 = $bytes.Length
            # Required so the SW scope covers the whole project folder
            if ($relPath -eq 'sw.js') { $res.Headers.Add('Service-Worker-Allowed', '/') }
            $res.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $body = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $relPath")
            $res.StatusCode      = 404
            $res.ContentType     = 'text/plain'
            $res.ContentLength64 = $body.Length
            $res.OutputStream.Write($body, 0, $body.Length)
        }
        $res.OutputStream.Close()

        $color = if ($res.StatusCode -eq 200) { 'DarkGray' } else { 'Yellow' }
        Write-Host "  $($res.StatusCode)  $relPath" -ForegroundColor $color

    } catch [System.Net.HttpListenerException] {
        break   # Ctrl+C shutdown
    } catch { }
}

$listener.Stop()
Write-Host "`n  Server stopped." -ForegroundColor Gray
