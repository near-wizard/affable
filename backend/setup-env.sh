#!/bin/bash
# Quick setup script to install all dependencies
# Usage: bash setup-env.sh

set -e

echo "🚀 Setting up Affable backend testing environment..."
echo ""

# Check Python version
echo "📦 Checking Python version..."
python --version

echo ""
echo "📥 Installing dependencies..."
echo "   (This may take a minute...)"
echo ""

# Install requirements
pip install -q -r requirements.txt
pip install -q -r requirements-dev.txt

echo ""
echo "✅ Installation complete!"
echo ""
echo "🧪 Verifying pytest..."
python -m pytest --version

echo ""
echo "✨ Environment ready! Try:"
echo ""
echo "   bash scripts/quick-test.sh"
echo ""
