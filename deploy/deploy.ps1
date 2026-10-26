<#
.SYNOPSIS
    Automated CI/CD Deployment Script for RxIntel Frontend on Windows Server (IIS).
.DESCRIPTION
    1. Validates repository and target branch.
    2. Automatically creates a timestamped backup of the current live site folder.
    3. Runs fast npm dependency check and optimized production build.
    4. Syncs the production build artifacts to live IIS web directory.
    5. Ensures React SPA URL Rewrite web.config is present.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string]$TargetBranch = "develop",

    [Parameter(Mandatory = $false)]
    [string]$IisSitePath = "C:\inetpub\wwwroot\RxIntel",

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
    Write-Step "Starting RxIntel Frontend Deployment..."
    
    # Auto-detect path if Plexoc subdirectory is used
    if (-not (Test-Path $IisSitePath) -and (Test-Path "C:\inetpub\wwwroot\Plexoc\RxIntel")) {
        $IisSitePath = "C:\inetpub\wwwroot\Plexoc\RxIntel"
    }

    Write-Host "Target IIS Path: $IisSitePath"
    Write-Host "Repository Dir:  $RepoDir"

    # 1. Verify Directories
    if (-not (Test-Path $RepoDir)) {
        throw "Repository directory '$RepoDir' not found."
    }

    # =========================================================================
    # STEP: AUTOMATIC PRE-DEPLOYMENT BACKUP
    # =========================================================================
    if (Test-Path $IisSitePath) {
        $hasFiles = (Get-ChildItem -Path $IisSitePath | Measure-Object).Count -gt 0
        if ($hasFiles) {
            $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
            $parentDir = Split-Path $IisSitePath -Parent
            $backupBase = Join-Path $parentDir "Backups"
            if (-not (Test-Path $backupBase)) {
                New-Item -ItemType Directory -Path $backupBase -Force | Out-Null
            }
            $targetFolderName = (Get-Item $IisSitePath).Name
            $backupFolder = Join-Path $backupBase "${targetFolderName}_$timestamp"
            
            Write-Step "CREATING BACKUP: Copying live UI files to '$backupFolder' before deployment..."
            New-Item -ItemType Directory -Path $backupFolder -Force | Out-Null
            
            # Fast recursive copy to backup folder
            & robocopy.exe "$IisSitePath" "$backupFolder" /E /R:1 /W:1 /NP | Out-Null
            Write-Success "Full UI backup created successfully at: '$backupFolder'"
        }
    } else {
        Write-WarningMsg "Target directory '$IisSitePath' does not exist yet. Creating directory..."
        New-Item -ItemType Directory -Path $IisSitePath -Force | Out-Null
    }

    # 2. Update Source from Git (optional, skipped if handled by GitHub Actions runner)
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
    Write-Success " Target: $IisSitePath"
    Write-Success " Live files backed up before sync."
    Write-Success "=========================================================="
    exit 0
}
catch {
    Write-Failure "Frontend Deployment FAILED: $_"
    exit 1
}
