#!/bin/bash

set -e

export TERM=dumb

# Download current snapshots
gradle -b download-current.gradle

# Clone newest styles
[[ -d styles ]] || git clone https://github.com/citation-style-language/styles.git

# Clone newest locales
[[ -d locales ]] || git clone https://github.com/citation-style-language/locales.git

# Clean directories for better diff
rm -r build/styles/META-INF
rm -r build/locales/META-INF
find styles -mindepth 1 ! -name '*.csl' ! -name 'dependent' -delete
find locales -mindepth 1 ! -name 'locales-*.xml' -delete

set +e

echo "Comparing styles ..."
diff -qr build/styles/ styles/
if [ ! "$?" -eq "0" ]; then
  set -e
  echo "Publishing new styles ..."
  cp build-styles-template.gradle styles/build.gradle
  cd styles
  gradle upload
  cd ..
  set +e
else
  echo "No changes."
fi

echo "Comparing locales ..."
diff -qr build/locales/ locales/
if [ ! "$?" -eq "0" ]; then
  set -e
  echo "Publishing new locales ..."
  cp build-locales-template.gradle locales/build.gradle
  cd locales
  gradle upload
  cd ..
  set +e
else
  echo "No changes."
fi
