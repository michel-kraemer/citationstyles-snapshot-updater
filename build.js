#!/usr/bin/env node

const { cp, exit, exec, find, pushd, popd, rm, touch } = require("shelljs")
const path = require("path")

const RELEASE = !!process.env["RELEASE"]
const firstDayOfMonth = new Date().getDate() === 1

const GRADLE_EXECUTABLE = `"${__dirname}/gradlew"`

rm("-rf", ["locales", "styles"])

// Download current snapshots
if (!RELEASE) {
  if (exec(`${GRADLE_EXECUTABLE} -b download-current.gradle`).code !== 0) {
    exit(1)
  }
}

// Clone latest styles
if (exec("git clone --depth 1 https://github.com/citation-style-language/styles.git").code !== 0) {
  exit(1)
}

// # Clone newest locales
if (exec("git clone --depth 1 https://github.com/citation-style-language/locales.git").code !== 0) {
  exit(1)
}

// Clean directories for better diff
rm("-rf", ["build/locales/META-INF", "build/styles/META-INF"])

// Only keep files that should be included in the distribution
let stylesFilesToDelete = find("styles").filter(f => f !== "styles" &&
  !f.endsWith(".csl") && path.basename(f) !== "dependent")
let localesFilesToDelete = find("locales").filter(f => f !== "locales" &&
  !(path.basename(f).startsWith("locales-") && f.endsWith(".xml")))
rm("-rf", stylesFilesToDelete)
rm("-rf", localesFilesToDelete)

console.log("Comparing styles ...")
let stylesdiff = exec("diff -qr build/styles/ styles/").code
if (RELEASE || stylesdiff !== 0 || firstDayOfMonth) {
  console.log("Publishing new styles ...")
  cp("build-styles-template.gradle", "styles/build.gradle")
  touch("styles/settings.gradle")
  pushd("-q", "styles")
  if (exec(`${GRADLE_EXECUTABLE} publishToSonatype closeAndReleaseSonatypeStagingRepository`).code !== 0) {
    exit(1)
  }
  popd("-q")
} else {
  console.log("No changes.")
}

console.log("Comparing locales ...")
let localesdiff = exec("diff -qr build/locales/ locales/").code
if (RELEASE || localesdiff !== 0 || firstDayOfMonth) {
  console.log("Publishing new locales ...")
  cp("build-locales-template.gradle", "locales/build.gradle")
  touch("locales/settings.gradle")
  pushd("-q", "locales")
  if (exec(`${GRADLE_EXECUTABLE} publishToSonatype closeAndReleaseSonatypeStagingRepository`).code !== 0) {
    exit(1)
  }
  popd("-q")
} else {
  console.log("No changes.")
}
