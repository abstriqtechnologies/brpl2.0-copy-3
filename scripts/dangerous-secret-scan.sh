#!/usr/bin/env bash
#
# scripts/dangerous-secret-scan.sh
#
# Scans the working tree for known secret prefixes (OpenAI, Razorpay,
# MongoDB-with-creds, AWS). Exits non-zero on any hit so CI can block
# a merge before the secret lands in git history.
#
# Run from the repo root. Safe to wire into Husky `pre-commit` and the
# CI pipeline.
#
# Usage:
#   bash scripts/dangerous-secret-scan.sh
#
# Exit codes:
#   0 — clean
#   1 — at least one secret pattern matched
#   2 — pattern file is malformed (caller bug)

set -euo pipefail

# Files / dirs to skip: never contain real secrets (only metadata).
SKIP_REGEX='(^|/)(node_modules|\.next|\.git|coverage|public/uploads|docs/|CHANGELOG\.md|\.env\.production-secrets-backup|/audit-findings-.*\.csv)(/|$)'

# Patterns: each MUST be anchored on a high-entropy prefix to keep
# false-positive rate low. Add new providers here as they come online.
PATTERNS=(
    'sk-(proj-)?[A-Za-z0-9_-]{20,}'        # OpenAI sk-… or sk-proj-…
    'sk-[A-Za-z0-9]{20,}'                  # OpenAI legacy
    'rzp_(test|live)_[A-Za-z0-9]{14,}'     # Razorpay
    'mongodb(\+srv)?://[^[:space:]]*:[^[:space:]@]+@'  # Mongo with embedded creds
    'AKIA[0-9A-Z]{16}'                     # AWS access key id
    'ASIA[0-9A-Z]{16}'                     # AWS session token
    'ghp_[A-Za-z0-9]{30,}'                 # GitHub PAT
    'xox[baprs]-[A-Za-z0-9-]{10,}'         # Slack tokens
)

FAIL=0
for p in "${PATTERNS[@]}"; do
    # grep -E: extended regex; -r: recursive; -I: skip binary; -n: line numbers
    HITS=$(grep -ErI -n --exclude-dir={node_modules,.next,.git,coverage} \
        --exclude='*.lock' --exclude='*.lockb' --exclude='package-lock.json' \
        "$p" src tests scripts 2>/dev/null \
        | grep -Ev "$SKIP_REGEX" || true)
    if [ -n "$HITS" ]; then
        echo "❌ Secret pattern matched: $p"
        echo "$HITS"
        echo
        FAIL=1
    fi
done

if [ $FAIL -eq 0 ]; then
    echo "✅ No dangerous secret patterns found."
fi
exit $FAIL