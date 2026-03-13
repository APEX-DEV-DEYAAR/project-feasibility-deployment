Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $root

$serverPort = 4000
$cloudflaredPath = Join-Path $root 'cloudflared.exe'

function Write-Step {
  param([string]$Message)
  Write-Host ('[start-tunnel] ' + $Message) -ForegroundColor Cyan
}

# Stop existing processes on port 4000
Write-Step ('Stopping any existing process on port ' + $serverPort)
$connections = @(Get-NetTCPConnection -LocalPort $serverPort -State Listen -ErrorAction SilentlyContinue)
foreach ($conn in $connections) {
  $p = $conn.OwningProcess
  if ($p -and $p -ne 0) {
    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
    Write-Step ('Stopped PID ' + $p)
  }
}

# Clear logs
foreach ($log in @('server.log', 'server.err.log', 'tunnel.log')) {
  $logPath = Join-Path $root $log
  if (Test-Path $logPath) { Clear-Content $logPath -ErrorAction SilentlyContinue }
}

# Start backend server
Write-Step 'Starting backend server...'
$serverProc = Start-Process -FilePath 'cmd.exe' `
  -ArgumentList '/c', 'npm run dev --workspace server' `
  -WorkingDirectory $root `
  -WindowStyle Hidden `
  -RedirectStandardOutput (Join-Path $root 'server.log') `
  -RedirectStandardError (Join-Path $root 'server.err.log') `
  -PassThru

Write-Step ('Backend PID: ' + $serverProc.Id)

# Wait for backend to be ready
$healthUrl = 'http://localhost:' + $serverPort + '/api/health'
Write-Step ('Waiting for backend at ' + $healthUrl)
$maxWait = 45
$elapsed = 0
while ($elapsed -lt $maxWait) {
  try {
    $null = Invoke-WebRequest -UseBasicParsing -Uri $healthUrl -TimeoutSec 3
    break
  } catch {
    Start-Sleep -Seconds 1
    $elapsed++
  }
}

if ($elapsed -ge $maxWait) {
  Write-Host '[start-tunnel] ERROR: Backend failed to start. Check server.err.log' -ForegroundColor Red
  exit 1
}

Write-Step ('Backend is running on http://localhost:' + $serverPort)

# Start Cloudflare Tunnel
Write-Step 'Starting Cloudflare Tunnel...'
Write-Step 'The tunnel URL will appear below. Copy it and set VITE_API_URL on Vercel.'
Write-Step 'Example: VITE_API_URL=https://xxxx-xxxx.trycloudflare.com/api'
Write-Host ''
Write-Host '========================================' -ForegroundColor Yellow
Write-Host '  TUNNEL OUTPUT (look for the URL):' -ForegroundColor Yellow
Write-Host '========================================' -ForegroundColor Yellow
Write-Host ''

$tunnelTarget = 'http://localhost:' + $serverPort
& $cloudflaredPath tunnel --url $tunnelTarget
