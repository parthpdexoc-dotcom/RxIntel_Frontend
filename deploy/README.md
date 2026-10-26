# RxIntel Frontend CI/CD Setup for Gogs & IIS

This directory contains automated CI/CD deployment scripts configured specifically for **Gogs Git Server** and **Windows Server (IIS)**.

---

## 📁 Files Included

1. **`deploy.ps1`**: The core PowerShell automation script.
   - Updates source code from Gogs for target branch (`DEVELOP`).
   - Runs `npm install --no-audit --prefer-offline`.
   - Runs `npm run build` to generate the production React build.
   - Uses `robocopy /PURGE` to deploy clean build artifacts to the live IIS folder (removes stale JS/CSS chunk hashes).
   - Verifies the SPA routing `web.config` is present for IIS URL Rewrite.
2. **`post-receive`**: The Gogs Git Hook.
   - Detects when changes are pushed to `DEVELOP`.
   - Automatically invokes `deploy.ps1`.

---

## 🚀 How to Set Up in Gogs (2 Simple Steps)

### Method 1: Via Gogs Web Interface (Easiest)
1. Open Gogs in your browser: `http://192.168.1.2:81/Plexoc/RxIntel_Frontend`
2. Go to **Settings** (top right) → **Git Hooks**.
3. Click on **Post-Receive**.
4. Copy the contents of [`post-receive`](post-receive) into the editor.
5. Update the path variables at the top of the hook if your repository or IIS paths differ:
   - `TARGET_BRANCH="DEVELOP"`
   - `DEPLOY_SCRIPT="F:/Projects/RX_INTEL_NEW/RxIntel_Frontend/deploy/deploy.ps1"`
   - `IIS_SITE_PATH="C:/inetpub/wwwroot/RxIntel_UI"`
6. Click **Update Hook**.

### Method 2: On the Gogs Host Server File System
If you have filesystem access to where Gogs stores repositories on the host:
1. Locate the bare repository: `<gogs-data>/repositories/Plexoc/RxIntel_Frontend.git/hooks/`
2. Place the [`post-receive`](post-receive) script in that directory.
3. Ensure it has execution permissions.

---

## 🧪 Testing the Deployment Manually

You can test the deployment locally at any time by running PowerShell as Administrator:
```powershell
powershell -ExecutionPolicy Bypass -File "F:\Projects\RX_INTEL_NEW\RxIntel_Frontend\deploy\deploy.ps1" -TargetBranch "DEVELOP" -IisSitePath "C:\inetpub\wwwroot\RxIntel_UI"
```
