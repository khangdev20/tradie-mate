#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$DIR"

# Open Simulator app
open -a Simulator

# Get booted simulator UDID
BOOTED_UDID=$(node -e '
  try {
    const d = JSON.parse(require("child_process").execSync("xcrun simctl list devices booted -j", { encoding: "utf8" }));
    const booted = Object.values(d.devices).flat().find(dev => dev.state === "Booted");
    if (booted) process.stdout.write(booted.udid);
  } catch (e) {}
')

if [ -z "$BOOTED_UDID" ]; then
  echo "No simulator currently booted. Booting iPhone 17 Pro Max..."
  xcrun simctl boot "iPhone 17 Pro Max" 2>/dev/null || xcrun simctl boot "iPhone 17" 2>/dev/null || true
  sleep 3
  BOOTED_UDID=$(node -e '
    try {
      const d = JSON.parse(require("child_process").execSync("xcrun simctl list devices booted -j", { encoding: "utf8" }));
      const booted = Object.values(d.devices).flat().find(dev => dev.state === "Booted");
      if (booted) process.stdout.write(booted.udid);
    } catch (e) {}
  ')
fi

if [ -z "$BOOTED_UDID" ]; then
  echo "Error: Could not detect or boot an iOS simulator."
  exit 1
fi

echo "Targeting simulator: $BOOTED_UDID"

# Build app
xcodebuild \
  -workspace ios/TradieMate.xcworkspace \
  -scheme TradieMate \
  -destination "id=$BOOTED_UDID" \
  ONLY_ACTIVE_ARCH=YES \
  -derivedDataPath ios/build \
  build

# Install app
echo "Installing TradieMate to simulator..."
xcrun simctl install booted ios/build/Build/Products/Debug-iphonesimulator/TradieMate.app

# Launch app
echo "Launching TradieMate..."
xcrun simctl launch booted com.tradiemate
