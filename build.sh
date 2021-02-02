#!/bin/bash

set -e

export TERM=dumb

rm -rf styles locales

# Download current snapshots
if [ "$RELEASE" != "true" ]; then
  gradle -b download-current.gradle
fi

# Clone newest styles
[[ -d styles ]] || git clone --depth 1 https://github.com/citation-style-language/styles.git

# Clone newest locales
[[ -d locales ]] || git clone --depth 1 https://github.com/citation-style-language/locales.git

# Clean directories for better diff
rm -rf build/styles/META-INF
rm -rf build/locales/META-INF
find styles -mindepth 1 ! -name '*.csl' ! -name 'dependent' -delete
find locales -mindepth 1 ! -name 'locales-*.xml' -delete

set +e

echo "Comparing styles ..."
diff -qr build/styles/ styles/
stylesdiff=$?
if [ "$RELEASE" == "true" ] || [ ! "$stylesdiff" -eq "0" ] || [ $(date +%d) -eq 1 ]; then
  set -e
  echo "Publishing new styles ..."
  cp build-styles-template.gradle styles/build.gradle
  test -f "gradle.properties" && cp gradle.properties styles
  cd styles
  gradle upload
  test -f "gradle.properties" && rm gradle.properties
  cd ..
  set +e
else
  echo "No changes."
fi

echo "Comparing locales ..."
diff -qr build/locales/ locales/
localesdiff=$?
if [ "$RELEASE" == "true" ] || [ ! "$localesdiff" -eq "0" ] || [ $(date +%d) -eq 1 ]; then
  set -e
  echo "Publishing new locales ..."
  cp build-locales-template.gradle locales/build.gradle
  test -f "gradle.properties" && cp gradle.properties locales
  cd locales
  gradle upload
  test -f "gradle.properties" && rm gradle.properties
  cd ..
  set +e
else
  echo "No changes."
fi
