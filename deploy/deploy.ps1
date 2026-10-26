<#
.SYNOPSIS
    Automated CI/CD Deployment Script for RxIntel Frontend on Windows Server (IIS) via Gogs.
.DESCRIPTION
    1. Validates repository and target branch.
    2. Runs npm install and npm run build.
    3. Syncs the production build artifacts to the live IIS web directory.
    4. Ensures React SPA URL Rewrite web.config is present.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$TargetBranch = "DEVELOP",

    [Parameter(Mandatory = $false)]
    [string]$IisSitePath = "C:\inetpub\wwwroot\RxIntel_UI",

    [Parameter(Mandatory = $false)]
    [string]$RepoDir = $PSScriptRoot + "\..",

    [Parameter(Mandatory = $false)]
    [switch]$SkipGitPull = $false
)

$ErrorActionPreference = "Stop"

function Write-Step ([string]$msg) {
    Write-Host "`n>>> [CI/CD:UI] $msg" -ForegroundColor Cyan
}

function Write-Success ([string]$msg) {
    Write-Host ">>> [SUCCESS] $msg" -ForegroundColor Green
}

function Write-WarningMsg ([string]$msg) {
    Write-Host ">>> [WARNING] $msg" -ForegroundColor Yellow
}

function Write-Failure ([string]$msg) {
    Write-Host ">>> [ERROR] $msg" -ForegroundColor Red
}

try {
    Write-Step "Starting RxIntel Frontend Deployment for branch: '$TargetBranch'..."
    Write-Host "Target IIS Path: $IisSitePath"
    Write-Host "Repository Dir:  $RepoDir"

    # 1. Verify Directories
    if (-not (Test-Path $RepoDir)) {
        throw "Repository directory '$RepoDir' not found."
    }

    if (-not (Test-Path $IisSitePath)) {
        Write-WarningMsg "IIS Site Path '$IisSitePath' does not exist. Creating directory..."
        New-Item -ItemType Directory -Path $IisSitePath -Force | Out-Null
    }

    Push-Location $RepoDir
    try {
        if (-not $SkipGitPull) {
            Write-Step "Updating repository working tree to latest '$TargetBranch'..."
            git fetch origin $TargetBranch
            git checkout $TargetBranch
            git reset --hard "origin/$TargetBranch"
        }
        
        # 3. Install Dependencies (fast check: skip if node_modules already exists)
        $nodeModules = Join-Path $RepoDir "node_modules"
        if (-not (Test-Path $nodeModules)) {
            Write-Step "Installing npm dependencies (first time)..."
            $env:NODE_ENV = "development" # Allow devDependencies for build
            cmd.exe /c "npm install --no-audit --prefer-offline"
            if ($LASTEXITCODE -ne 0) {
                throw "npm install failed with exit code $LASTEXITCODE."
            }
        } else {
            Write-Host ">>> node_modules already exists. Skipping redundant npm install." -ForegroundColor DarkGray
        }

        # 4. Build Production Bundle (optimized)
        Write-Step "Building React production bundle (npm run build)..."
        $env:CI = "false"
        $env:DISABLE_ESLINT_PLUGIN = "true"
        $env:NODE_ENV = "production"
        $env:GENERATE_SOURCEMAP = "false"
        cmd.exe /c "npm run build"
        if ($LASTEXITCODE -ne 0) {
            throw "npm run build failed with exit code $LASTEXITCODE."
        }
    }
    finally {
        Pop-Location
    }

    $buildFolder = Join-Path $RepoDir "build"
    if (-not (Test-Path $buildFolder)) {
        throw "Build output folder '$buildFolder' not found."
    }

    # 5. Sync to IIS Directory with ROBOCOPY
    Write-Step "Deploying build output to IIS directory: '$IisSitePath'..."
    
    # Robocopy flags:
    # /E   : Copy all subdirectories, including empty ones.
    # /PURGE: Delete destination files that no longer exist in source (cleans up old hashed JS/CSS chunks).
    # /R:2 : Retry twice on lock.
    # /W:2 : Wait 2 seconds.
    # /NP  : No progress percentage.
    $robocopyArgs = @(
        "$buildFolder",
        "$IisSitePath",
        "/E",
        "/PURGE",
        "/R:2",
        "/W:2",
        "/NP"
    )

    & robocopy.exe @robocopyArgs | Out-Null
    $roboExit = $LASTEXITCODE

    if ($roboExit -ge 8) {
        throw "Robocopy failed with exit code $roboExit."
    }

    # 6. Verify web.config for React SPA Routing in IIS
    $targetWebConfig = Join-Path $IisSitePath "web.config"
    if (-not (Test-Path $targetWebConfig)) {
        $sourceWebConfig = Join-Path $RepoDir "public\web.config"
        if (Test-Path $sourceWebConfig) {
            Write-Step "Ensuring React SPA URL Rewrite web.config is present in IIS..."
            Copy-Item -Path $sourceWebConfig -Destination $targetWebConfig -Force
        }
    }

    Write-Success "=========================================================="
    Write-Success " RxIntel Frontend Deployment Completed Successfully! "
    Write-Success " Target Branch: $TargetBranch | IIS Path: $IisSitePath"
    Write-Success "=========================================================="
    exit 0
}
catch {
    Write-Failure "Frontend Deployment FAILED: $_"
    exit 1
}
