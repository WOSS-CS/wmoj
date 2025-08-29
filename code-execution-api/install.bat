@echo off
echo 🚀 Installing WMOJ Custom Judge API Dependencies for Windows...

REM Check if chocolatey is installed
choco --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 🍫 Chocolatey not found. Installing Chocolatey...
    powershell -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Chocolatey. Please install manually.
        echo Please install the following manually:
        echo   - Python 3: https://python.org/downloads/
        echo   - Node.js: https://nodejs.org/
        echo   - Java 17: https://adoptium.net/
        echo   - Git: https://git-scm.com/
        echo   - MinGW-w64: https://mingw-w64.org/
        pause
        exit /b 1
    )
)

echo 📦 Installing programming languages via Chocolatey...

REM Install dependencies
choco install -y python nodejs openjdk17 git mingw golang rust

if %errorlevel% neq 0 (
    echo ❌ Some packages failed to install. Please check and install manually.
)

REM Install npm dependencies
echo 📦 Installing Node.js dependencies...
if not exist package.json (
    echo ❌ package.json not found. Make sure you're in the code-execution-api directory
    pause
    exit /b 1
)

call npm install

if %errorlevel% neq 0 (
    echo ❌ Failed to install npm dependencies
    pause
    exit /b 1
)

REM Create directories
echo 📁 Creating required directories...
if not exist temp mkdir temp
if not exist logs mkdir logs

REM Create .env file if it doesn't exist
if not exist .env (
    echo ⚙️ Creating environment file...
    (
        echo NODE_ENV=development
        echo PORT=3002
        echo API_SECRET_KEY=%RANDOM%%RANDOM%%RANDOM%%RANDOM%
        echo ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
        echo MAX_EXECUTION_TIME=10000
        echo MAX_MEMORY_LIMIT=256
        echo MAX_CODE_LENGTH=50000
        echo MAX_INPUT_LENGTH=10000
        echo MAX_OUTPUT_LENGTH=100000
        echo RATE_LIMIT_WINDOW_MS=60000
        echo RATE_LIMIT_MAX_REQUESTS=100
        echo CLEANUP_INTERVAL_MINUTES=5
        echo MAX_TEMP_FILE_AGE_MINUTES=10
    ) > .env
    echo ✅ Created .env file
)

REM Test installations
echo 🧪 Testing installations...

python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Python: 
    python --version
) else (
    echo ❌ Python not found in PATH
)

node --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Node.js: 
    node --version
) else (
    echo ❌ Node.js not found in PATH
)

java --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Java: 
    java --version | findstr /C:"openjdk"
) else (
    echo ❌ Java not found in PATH
)

gcc --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ GCC: 
    gcc --version | findstr /C:"gcc"
) else (
    echo ❌ GCC not found in PATH
)

go version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Go: 
    go version
) else (
    echo ❌ Go not found in PATH
)

rustc --version >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Rust: 
    rustc --version
) else (
    echo ❌ Rust not found in PATH
)

REM Build TypeScript
echo 🔨 Building TypeScript...
call npm run build

echo.
echo 🎉 Installation complete!
echo.
echo 🚀 To start the API server:
echo    npm run dev    # Development mode
echo    npm start      # Production mode
echo.
echo 🔧 Configuration:
echo    Edit .env file to customize settings
echo    Default port: 3002
echo    Health check: http://localhost:3002/health
echo.
echo 📚 Integration with WMOJ:
echo    Add to your WMOJ .env.local:
echo    CUSTOM_JUDGE_API_URL=http://localhost:3002

REM Get API key from .env file
for /f "tokens=2 delims==" %%a in ('type .env ^| findstr "API_SECRET_KEY"') do set API_KEY=%%a
echo    CUSTOM_JUDGE_API_KEY=%API_KEY%

echo.
echo Press any key to continue...
pause >nul
