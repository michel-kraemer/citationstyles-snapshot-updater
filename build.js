#!/usr/bin/env node

const { cp, exit, exec, find, mkdir, rm, touch } = require("shelljs")
const path = require("path")

const RELEASE = !!process.env["RELEASE"]
const firstDayOfMonth = new Date().getDate() === 1

const GRADLE_EXECUTABLE = `"${__dirname}/gradlew"`

// Delete previous build artifacts
rm("-rf", ["build"])
mkdir("build")

// Download current snapshots
if (!RELEASE) {
  if (exec(`${GRADLE_EXECUTABLE} -b download-current.gradle`).code !== 0) {
    exit(1)
  }
}

// Initialize and update submodules (just to be on the safe side)
if (exec("git submodule init").code !== 0) {
  exit(1)
}
if (exec("git submodule update").code !== 0) {
  exit(1)
}

// Clean styles, checkout master, and pull latest commit
if (exec("git clean -fdx", { cwd: "styles" }).code !== 0) {
  exit(1)
}
if (exec("git checkout master", { cwd: "styles" }).code !== 0) {
  exit(1)
}
if (exec("git pull --ff-only", { cwd: "styles" }).code !== 0) {
  exit(1)
}

// Clean locales, checkout master, and pull latest commit
if (exec("git clean -fdx", { cwd: "locales" }).code !== 0) {
  exit(1)
}
if (exec("git checkout master", { cwd: "locales" }).code !== 0) {
  exit(1)
}
if (exec("git pull --ff-only", { cwd: "locales" }).code !== 0) {
  exit(1)
}

// Remove directories for better diff
rm("-rf", ["build/locales-snapshot/META-INF", "build/styles-snapshot/META-INF"])

// Make temporary copy of styles and locales in build directory
cp("-r", "styles", "build/styles-release")
cp("-r", "locales", "build/locales-release")

// Only keep files that should be included in the distribution
let stylesFilesToDelete = find("build/styles-release").filter(f => f !== "build/styles-release" &&
  !f.endsWith(".csl") && path.basename(f) !== "dependent")
let localesFilesToDelete = find("build/locales-release").filter(f => f !== "build/locales-release" &&
  !(path.basename(f).startsWith("locales-") && f.endsWith(".xml")))
rm("-rf", stylesFilesToDelete)
rm("-rf", localesFilesToDelete)

console.log("Comparing styles ...")
let stylesdiff = exec("diff -qr build/styles-snapshot/ build/styles-release/").code
if (RELEASE || stylesdiff !== 0 || firstDayOfMonth) {
  console.log("Publishing new styles ...")
  cp("build-styles-template.gradle", "build/styles-release/build.gradle")
  touch("build/styles-release/settings.gradle")
  if (exec(`${GRADLE_EXECUTABLE} publishToSonatype closeAndReleaseSonatypeStagingRepository`, { cwd: "build/styles-release" }).code !== 0) {
    exit(1)
  }
} else {
  console.log("No changes.")
}

console.log("Comparing locales ...")
let localesdiff = exec("diff -qr build/locales-snapshot/ build/locales-release/").code
if (RELEASE || localesdiff !== 0 || firstDayOfMonth) {
  console.log("Publishing new locales ...")
  cp("build-locales-template.gradle", "build/locales-release/build.gradle")
  touch("build/locales-release/settings.gradle")
  if (exec(`${GRADLE_EXECUTABLE} publishToSonatype closeAndReleaseSonatypeStagingRepository`, { cwd: "build/locales-release" }).code !== 0) {
    exit(1)
  }
} else {
  console.log("No changes.")
}
