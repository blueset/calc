#!/usr/bin/env pwsh
# Build Iosevka Holpxay from private-build-plans.toml using Docker.
# Usage: ./build.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$ScriptDir = $PSScriptRoot
$PlanName = "IosevkaHolpxay"
$Image = "mikewhy/docker-iosevka-custom-build:latest"

# Ensure private-build-plans.toml exists
$BuildPlans = Join-Path $ScriptDir "private-build-plans.toml"
if (-not (Test-Path $BuildPlans)) {
    Write-Error "private-build-plans.toml not found in $ScriptDir"
    exit 1
}

Write-Host "Building Iosevka with plan '$PlanName'..." -ForegroundColor Cyan

# Create a local dist directory to capture build output
$DistRoot = Join-Path $ScriptDir "dist"
if (-not (Test-Path $DistRoot)) {
    New-Item -ItemType Directory -Path $DistRoot | Out-Null
}

# The image has WORKDIR /app with Iosevka source pre-installed.
# Mount the TOML config into /app and a local dist dir to capture output.
docker run -it --rm `
    -v "${BuildPlans}:/app/private-build-plans.toml:ro" `
    -v "${DistRoot}:/app/dist" `
    $Image `
    npm run build -- "contents::${PlanName}"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker build failed with exit code $LASTEXITCODE"
    exit $LASTEXITCODE
}

$DistDir = Join-Path $ScriptDir "dist" $PlanName

if (-not (Test-Path $DistDir)) {
    Write-Error "Build output not found at $DistDir"
    exit 1
}

# Copy TTF files
$SrcTTF = Join-Path $DistDir "TTF"
$DstTTF = Join-Path $ScriptDir "TTF"
if (Test-Path $SrcTTF) {
    Write-Host "Copying TTF files..." -ForegroundColor Cyan
    if (Test-Path $DstTTF) { Remove-Item -Path "$DstTTF\*" -Force }
    else { New-Item -ItemType Directory -Path $DstTTF | Out-Null }
    Copy-Item -Path "$SrcTTF\*" -Destination $DstTTF -Force
}

# Copy WOFF2 files
$SrcWOFF2 = Join-Path $DistDir "WOFF2"
$DstWOFF2 = Join-Path $ScriptDir "WOFF2"
if (Test-Path $SrcWOFF2) {
    Write-Host "Copying WOFF2 files..." -ForegroundColor Cyan
    if (Test-Path $DstWOFF2) { Remove-Item -Path "$DstWOFF2\*" -Force }
    else { New-Item -ItemType Directory -Path $DstWOFF2 | Out-Null }
    Copy-Item -Path "$SrcWOFF2\*" -Destination $DstWOFF2 -Force
}

# Copy CSS file
$SrcCSS = Join-Path $DistDir "${PlanName}.css"
$DstCSS = Join-Path $ScriptDir "Iosevka.css"
if (Test-Path $SrcCSS) {
    Write-Host "Copying CSS file..." -ForegroundColor Cyan
    Copy-Item -Path $SrcCSS -Destination $DstCSS -Force
}

# Clean up dist directory
$DistRoot = Join-Path $ScriptDir "dist"
if (Test-Path $DistRoot) {
    Write-Host "Cleaning up dist directory..." -ForegroundColor Cyan
    Remove-Item -Path $DistRoot -Recurse -Force
}

Write-Host "Build complete!" -ForegroundColor Green
Write-Host "  TTF:   $DstTTF"
Write-Host "  WOFF2: $DstWOFF2"
Write-Host "  CSS:   $DstCSS"
