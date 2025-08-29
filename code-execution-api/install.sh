#!/bin/bash

# WMOJ Custom Judge API Installation Script
# This script installs all required dependencies for the code execution API

set -e

echo "🚀 Installing WMOJ Custom Judge API Dependencies..."

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="mac"
elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

echo "📊 Detected OS: $OS"

# Install system dependencies based on OS
case $OS in
    "linux")
        echo "📦 Installing Linux dependencies..."
        
        # Update package manager
        sudo apt update
        
        # Install basic tools
        sudo apt install -y curl wget build-essential
        
        # Install programming languages
        sudo apt install -y python3 python3-pip nodejs npm
        sudo apt install -y openjdk-17-jdk
        sudo apt install -y gcc g++
        sudo apt install -y golang-go
        
        # Install Rust
        if ! command -v rustc &> /dev/null; then
            echo "📦 Installing Rust..."
            curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
            source ~/.cargo/env
        fi
        ;;
        
    "mac")
        echo "📦 Installing macOS dependencies..."
        
        # Check if Homebrew is installed
        if ! command -v brew &> /dev/null; then
            echo "🍺 Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # Install programming languages
        brew install python3 node openjdk@17 gcc go rust
        ;;
        
    "windows")
        echo "📦 Windows detected. Please install dependencies manually:"
        echo "  - Python 3: https://python.org/downloads/"
        echo "  - Node.js: https://nodejs.org/"
        echo "  - Java 17: https://adoptium.net/"
        echo "  - MinGW-w64 (for C/C++): https://mingw-w64.org/"
        echo "  - Go: https://golang.org/dl/"
        echo "  - Rust: https://rustup.rs/"
        echo "  Or use chocolatey: choco install python nodejs openjdk mingw go rust"
        ;;
        
    *)
        echo "❌ Unsupported OS: $OSTYPE"
        echo "Please install dependencies manually"
        exit 1
        ;;
esac

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
cd "$(dirname "$0")"

if [ -f "package.json" ]; then
    npm install
else
    echo "❌ package.json not found. Make sure you're in the code-execution-api directory"
    exit 1
fi

# Create required directories
echo "📁 Creating required directories..."
mkdir -p temp logs

# Set up environment file
if [ ! -f ".env" ]; then
    echo "⚙️ Creating environment file..."
    cp .env.example .env 2>/dev/null || cat > .env << EOF
NODE_ENV=development
PORT=3002
API_SECRET_KEY=$(openssl rand -hex 32)
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
MAX_EXECUTION_TIME=10000
MAX_MEMORY_LIMIT=256
MAX_CODE_LENGTH=50000
MAX_INPUT_LENGTH=10000
MAX_OUTPUT_LENGTH=100000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CLEANUP_INTERVAL_MINUTES=5
MAX_TEMP_FILE_AGE_MINUTES=10
EOF
    echo "✅ Created .env file with secure API key"
fi

# Test installations
echo "🧪 Testing installations..."

# Test Python
if command -v python3 &> /dev/null; then
    echo "✅ Python 3: $(python3 --version)"
else
    echo "❌ Python 3 not found"
fi

# Test Node.js
if command -v node &> /dev/null; then
    echo "✅ Node.js: $(node --version)"
else
    echo "❌ Node.js not found"
fi

# Test Java
if command -v java &> /dev/null; then
    echo "✅ Java: $(java --version | head -n1)"
else
    echo "❌ Java not found"
fi

# Test C++
if command -v g++ &> /dev/null; then
    echo "✅ C++: $(g++ --version | head -n1)"
else
    echo "❌ C++ compiler not found"
fi

# Test Go
if command -v go &> /dev/null; then
    echo "✅ Go: $(go version)"
else
    echo "❌ Go not found"
fi

# Test Rust
if command -v rustc &> /dev/null; then
    echo "✅ Rust: $(rustc --version)"
else
    echo "❌ Rust not found"
fi

# Build TypeScript
echo "🔨 Building TypeScript..."
npm run build

echo ""
echo "🎉 Installation complete!"
echo ""
echo "🚀 To start the API server:"
echo "   npm run dev    # Development mode"
echo "   npm start      # Production mode"
echo ""
echo "🔧 Configuration:"
echo "   Edit .env file to customize settings"
echo "   Default port: 3002"
echo "   Health check: http://localhost:3002/health"
echo ""
echo "📚 Integration with WMOJ:"
echo "   Add to your WMOJ .env.local:"
echo "   CUSTOM_JUDGE_API_URL=http://localhost:3002"
echo "   CUSTOM_JUDGE_API_KEY=$(grep API_SECRET_KEY .env | cut -d'=' -f2)"
