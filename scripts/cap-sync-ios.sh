#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# npm/cron often have a minimal PATH and pick /usr/bin/bundle (Ruby 2.6). Gemfile.lock
# is generated with Homebrew Ruby + Bundler 4.x — system Ruby then errors with:
#   Could not find 'bundler' (x.y.z) required by your Gemfile.lock
brew_ruby_bin=""
if command -v brew >/dev/null 2>&1; then
  rp="$(brew --prefix ruby 2>/dev/null || true)"
  if [[ -n "${rp}" && -x "${rp}/bin/ruby" ]]; then
    brew_ruby_bin="${rp}/bin"
  fi
fi
for prefix in "${brew_ruby_bin}" /opt/homebrew/opt/ruby/bin /usr/local/opt/ruby/bin; do
  if [[ -n "${prefix}" && -x "${prefix}/ruby" ]]; then
    export PATH="${prefix}:${PATH}"
    break
  fi
done

cd "${ROOT}/ios/App"
bundle install
cd "${ROOT}"
npx cap sync ios
node "${ROOT}/scripts/ensure-ios-widget-plugin.mjs"
