#!/bin/bash

# Script to bump version in package.json
# Usage: ./bump-version.sh <major|minor|patch>

set -e

VERSION_BUMP=$1

if [ -z "$VERSION_BUMP" ]; then
  echo "Error: Version bump type not specified"
  echo "Usage: ./bump-version.sh <major|minor|patch>"
  exit 1
fi

# Bump version using bun version command, then read new version from package.json using jq
bun version "$VERSION_BUMP" --no-git-tag-version
NEW_VERSION=$(jq -r .version package.json)
echo "New version: $NEW_VERSION"

# Commit the version bump
git add package.json
git commit -m "chore: bump version to $NEW_VERSION"

# Create and push tag
git tag "v$NEW_VERSION"
git push origin HEAD --tags

# Output the new version for GitHub Actions
echo "new_version=$NEW_VERSION"
echo "tag_name=v$NEW_VERSION"
