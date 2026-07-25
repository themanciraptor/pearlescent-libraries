# This script was created because I only could auth npm publish using legacy mode. This script allows me to
# run the angular builds inside wsl2, and then copy the dist out into windows where I can use Windows' npm
# executable to publish.

param(
    [Parameter(Position=0, Mandatory=$true)]
    [string]$ProjectName
)

# --- CONFIGURATION ---
# Update these paths to match your local environment before running.
# Note: For WSL paths, ensure you use the correct path to your home directory.
$wslRepoPath = "~/repos/pearlescent-libraries"
$wslDistPath = "\\wsl$\Ubuntu\home\YOUR_USERNAME\repos\pearlescent-libraries\dist\pearlescent\$ProjectName"
$winDestPath = "C:\tmp\$ProjectName"

# 1. Build the project in WSL
Write-Host "Step 1: Building $ProjectName in WSL..." -ForegroundColor Cyan
wsl -e bash -lic "cd $wslRepoPath && ng build $ProjectName"

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: The 'ng build' command failed in WSL (Exit Code: $LASTEXITCODE)." -ForegroundColor Red
    Write-Host "Aborting script." -ForegroundColor Yellow
    exit 1
}

# 2. Copy the build artifacts from WSL to Windows
# We check if the source exists first to prevent the script from crashing
if (Test-Path $wslDistPath) {
    Write-Host "Step 2: Copying build artifacts to $winDestPath..." -ForegroundColor Cyan
    
    if (!(Test-Path "C:\tmp")) {
        New-Item -ItemType Directory -Path "C:\tmp" -Force | Out-Null
    }

    if (Test-Path $winDestPath) {
        Remove-Item -Path $winDestPath -Recurse -Force
    }

    Copy-Item -Path $wslDistPath -Destination "C:\tmp\" -Recurse -Force
}
else {
    Write-Error "Error: Source path $wslDistPath not found. The build process may have failed."
    exit
}

# 3. Navigate to the local directory and publish
Write-Host "Step 3: Navigating to $winDestPath and publishing..." -ForegroundColor Cyan
Set-Location "C:\tmp\$ProjectName"
npm publish
