[CmdletBinding()]
param(
  [switch]$InstallDeps,
  [switch]$SkipHealthCheck,
  [switch]$DryRun
)

<#
.SYNOPSIS
  Restart the full CMSTest application stack.

.DESCRIPTION
  This script performs a clean restart of the application by:
  1) Stopping existing app processes/sessions (backend/frontend) for this repo.
  2) Releasing listening ports used by the app (4000 API, 5173 Vite).
  3) Optionally installing dependencies.
  4) Starting backend and frontend in background sessions.
  5) Verifying health endpoints unless -SkipHealthCheck is passed.

.USAGE
  powershell -ExecutionPolicy Bypass -File .\start.ps1
  powershell -ExecutionPolicy Bypass -File .\start.ps1 -InstallDeps
  powershell -ExecutionPolicy Bypass -File .\start.ps1 -DryRun

.NOTES
  - Logs are written to:
      .\server.log
      .\server.err.log
      .\client.log
      .\client.err.log
  - Backend URL:  http://localhost:4000/api/health
  - Frontend URL: http://localhost:5173
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = if ($PSScriptRoot) { $PSScriptRoot } else { (Get-Location).Path }
Set-Location $root

$serverPort = 4000
$clientPort = 5173

function Write-Step {
  param([string]$Message)
  Write-Host "[start.ps1] $Message"
}

function Invoke-OrDryRun {
  param(
    [scriptblock]$Action,
    [string]$Description
  )

  if ($DryRun) {
    Write-Step "DRY RUN: $Description"
    return
  }

  & $Action
}

function Stop-ByPort {
  param([int]$Port)

  $connections = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
  if ($connections.Count -eq 0) {
    Write-Step "No listener found on port $Port"
    return
  }

  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pidValue in $pids) {
    if (-not $pidValue -or $pidValue -eq 0) { continue }
    try {
      $proc = Get-Process -Id $pidValue -ErrorAction Stop
      Invoke-OrDryRun -Description "Stop PID $pidValue on port $Port ($($proc.ProcessName))" -Action {
        Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
      }
    } catch {
      Write-Step "PID $pidValue on port $Port already exited"
    }
  }
}

function Stop-AppProcessesForRepo {
  $escapedRoot = [Regex]::Escape($root)
  $targets = @(Get-CimInstance Win32_Process -Filter "Name='node.exe' OR Name='cmd.exe'" -ErrorAction SilentlyContinue)

  $matches = @($targets | Where-Object {
    $cmd = $_.CommandLine
    if ([string]::IsNullOrWhiteSpace($cmd)) { return $false }

    ($cmd -match $escapedRoot) -and (
      ($cmd -match "npm run dev") -or
      ($cmd -match "npm run start") -or
      ($cmd -match "vite") -or
      ($cmd -match "src\\index\.(ts|js)") -or
      ($cmd -match "tsx(\.cmd)?\s+watch\s+src\\index\.ts") -or
      ($cmd -match "tsx(\.cmd)?\s+src\\index\.ts")
    )
  })

  if (-not $matches -or $matches.Count -eq 0) {
    Write-Step "No matching CMSTest node/cmd sessions found"
    return
  }

  foreach ($proc in $matches) {
    $id = $proc.ProcessId
    $name = $proc.Name
    $cmd = $proc.CommandLine
    Invoke-OrDryRun -Description "Stop PID $id ($name)" -Action {
      Stop-Process -Id $id -Force -ErrorAction SilentlyContinue
    }
    Write-Step "Matched: PID=$id Name=$name Cmd=$cmd"
  }
}

function Start-AppSessions {
  Write-Step "Starting backend"
  Invoke-OrDryRun -Description "Start backend npm run dev --workspace server" -Action {
    Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c", "npm run dev --workspace server" `
      -WorkingDirectory $root `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $root "server.log") `
      -RedirectStandardError (Join-Path $root "server.err.log") | Out-Null
  }

  Write-Step "Starting frontend"
  Invoke-OrDryRun -Description "Start frontend npm run dev --workspace client" -Action {
    Start-Process -FilePath "cmd.exe" `
      -ArgumentList "/c", "npm run dev --workspace client" `
      -WorkingDirectory $root `
      -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $root "client.log") `
      -RedirectStandardError (Join-Path $root "client.err.log") | Out-Null
  }
}

function Wait-ForUrl {
  param(
    [string]$Url,
    [int]$MaxSeconds = 45
  )

  $sw = [Diagnostics.Stopwatch]::StartNew()
  while ($sw.Elapsed.TotalSeconds -lt $MaxSeconds) {
    try {
      $null = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 4
      return $true
    } catch {
      Start-Sleep -Milliseconds 800
    }
  }

  return $false
}

Write-Step "Repository root: $root"

Write-Step "Stopping existing app sessions"
Stop-AppProcessesForRepo
Stop-ByPort -Port $serverPort
Stop-ByPort -Port $clientPort

if ($InstallDeps) {
  Write-Step "Installing dependencies"
  Invoke-OrDryRun -Description "npm install" -Action {
    cmd.exe /c "npm install"
    if ($LASTEXITCODE -ne 0) {
      throw "npm install failed with exit code $LASTEXITCODE"
    }
  }
}

if (-not $DryRun) {
  foreach ($log in @("server.log", "server.err.log", "client.log", "client.err.log")) {
    $path = Join-Path $root $log
    if (Test-Path $path) {
      Clear-Content $path -ErrorAction SilentlyContinue
    }
  }
}

Start-AppSessions

if (-not $SkipHealthCheck -and -not $DryRun) {
  Write-Step "Checking backend health"
  $backendOk = Wait-ForUrl -Url "http://localhost:$serverPort/api/health"

  Write-Step "Checking frontend health"
  $frontendOk = Wait-ForUrl -Url "http://localhost:$clientPort"

  if ($backendOk -and $frontendOk) {
    Write-Step "Application restarted successfully"
    Write-Step "Frontend: http://localhost:$clientPort"
    Write-Step "Backend:  http://localhost:$serverPort/api/health"
    exit 0
  }

  if (-not $backendOk) {
    Write-Step "Backend health check failed. See server.err.log"
  }
  if (-not $frontendOk) {
    Write-Step "Frontend health check failed. See client.err.log"
  }

  exit 1
}

Write-Step "Restart sequence completed"
exit 0
