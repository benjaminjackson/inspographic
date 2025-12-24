#!/bin/bash
echo "Installing bd (beads issue tracker)..."

# Try npm first
npm install -g @beads/bd 2>/dev/null

# Fallback to Go if npm fails
if ! command -v bd &> /dev/null; then
  echo "npm install failed, trying Go..."
  go install github.com/steveyegge/beads/cmd/bd@latest
  export PATH="$PATH:$HOME/go/bin"
fi

# Initialize if needed
if [ ! -d .beads ]; then
  bd init --quiet
fi

echo "✓ bd is ready! Use 'bd ready' to see available work."
