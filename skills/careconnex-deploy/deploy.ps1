# CareConnex Deployment Script
# Usage: .\deploy.ps1 [all|frontend|functions] [-Verbose]

param(
    [Parameter(Position=0)]
    [ValidateSet("all", "frontend", "functions")]
    [string]$Target = "all",
    
    [switch]$ShowVerbose
)

$ErrorActionPreference = "Stop"
$projectRoot = "C:\Users\Anahi\.openclaw\workspace\careconnex"
$logFile = "$projectRoot\deploy.log"

function Write-Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp - $msg" | Tee-Object -FilePath $logFile -Append
}

function Test-FirebaseAuth {
    try {
        $result = firebase login:list 2>&1
        if ($result -match "No authorized accounts") {
            throw "Not authenticated with Firebase"
        }
        return $true
    } catch {
        Write-Log "ERROR: Firebase authentication failed. Run 'firebase login' first."
        return $false
    }
}

function Test-Environment {
    $envFile = "$projectRoot\.env.production"
    if (-not (Test-Path $envFile)) {
        Write-Log "WARNING: .env.production not found. Using .env.local if exists."
        $envFile = "$projectRoot\.env.local"
    }
    
    if (Test-Path $envFile) {
        Write-Log "Environment file found: $envFile"
        return $true
    } else {
        Write-Log "WARNING: No environment file found. Deploy may fail."
        return $false
    }
}

function Build-Frontend {
    Write-Log "Starting frontend build..."
    Set-Location $projectRoot
    
    if (Test-Path "$projectRoot\dist") {
        Remove-Item -Recurse -Force "$projectRoot\dist"
        Write-Log "Cleaned dist/ directory"
    }
    
    try {
        $buildOutput = npm run build 2>&1
        if ($ShowVerbose) { $buildOutput | Write-Log }
        
        if (Test-Path "$projectRoot\dist\index.html") {
            Write-Log "✅ Build successful"
            return $true
        } else {
            throw "Build output not found"
        }
    } catch {
        Write-Log "❌ Build failed: $_"
        return $false
    }
}

function Deploy-Frontend {
    Write-Log "Deploying frontend to Firebase Hosting..."
    Set-Location $projectRoot
    
    try {
        $deployOutput = firebase deploy --only hosting 2>&1
        if ($ShowVerbose) { $deployOutput | Write-Log }
        
        if ($deployOutput -match "Deploy complete") {
            $url = ($deployOutput | Select-String "https://.*\.web\.app").Matches[0].Value
            Write-Log "✅ Frontend deployed: $url"
            return $url
        } else {
            throw "Deploy command did not complete successfully"
        }
    } catch {
        Write-Log "❌ Frontend deploy failed: $_"
        return $null
    }
}

function Deploy-Functions {
    Write-Log "Deploying Cloud Functions..."
    Set-Location $projectRoot
    
    try {
        $deployOutput = firebase deploy --only functions 2>&1
        if ($ShowVerbose) { $deployOutput | Write-Log }
        
        if ($deployOutput -match "Deploy complete") {
            Write-Log "✅ Functions deployed"
            # Extract function URLs if any
            $functionUrls = $deployOutput | Select-String "https://.*cloudfunctions\.net.*" | ForEach-Object { $_.Matches[0].Value }
            return $functionUrls
        } else {
            throw "Deploy command did not complete successfully"
        }
    } catch {
        Write-Log "❌ Functions deploy failed: $_"
        return $null
    }
}

# Main execution
Write-Log "=== CareConnex Deployment Started (Target: $Target) ==="

# Pre-deploy checks
if (-not (Test-FirebaseAuth)) { exit 2 }
Test-Environment | Out-Null

$results = @{}

# Deploy frontend
if ($Target -eq "all" -or $Target -eq "frontend") {
    if (Build-Frontend) {
        $results.FrontendUrl = Deploy-Frontend
    } else {
        exit 1
    }
}

# Deploy functions
if ($Target -eq "all" -or $Target -eq "functions") {
    $results.FunctionUrls = Deploy-Functions
}

# Summary
Write-Log "=== Deployment Summary ==="
if ($results.FrontendUrl) {
    Write-Log "Frontend: $($results.FrontendUrl)"
}
if ($results.FunctionUrls) {
    Write-Log "Functions: $($results.FunctionUrls -join ', ')"
}

Write-Log "Deployment complete. Log: $logFile"
exit 0
