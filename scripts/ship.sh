#!/bin/bash
set -e

# Merges dev into main and pushes to trigger production deployment.

CURRENT=$(git branch --show-current)

echo "Switching to main..."
git checkout main
git pull origin main

echo "Merging dev..."
git merge dev --no-edit

echo "Pushing to origin/main..."
git push origin main

echo "Deployed. GitHub Actions will roll out to production."
echo ""
echo "Returning to $CURRENT..."
git checkout "$CURRENT"
