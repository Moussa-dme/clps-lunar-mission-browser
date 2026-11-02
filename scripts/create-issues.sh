#!/usr/bin/env bash
# Turn docs/backlog.md into GitHub issues, one per line, labelled by role.
# Needs the GitHub CLI, logged in: gh auth login
# Usage: scripts/create-issues.sh            (run from the repository root)
#        A=alice B=bob C=carol D=dave scripts/create-issues.sh   (also assigns)
set -euo pipefail
cd "$(dirname "$0")/.."
for role in A B C D; do
  gh label create "role:$role" --color "$(case $role in A) echo 1d76db;; B) echo 0e8a16;; C) echo fbca04;; D) echo d93f0b;; esac)" --force >/dev/null
done
grep -E '^[ABCD] \|' docs/backlog.md | while IFS='|' read -r role title done; do
  role=$(echo "$role" | xargs); title=$(echo "$title" | xargs); done=$(echo "$done" | xargs)
  who="${!role:-}"
  args=(--title "$title" --label "role:$role" --body "**Done when:** $done")
  [ -n "$who" ] && args+=(--assignee "$who")
  gh issue create "${args[@]}" >/dev/null && echo "created: [$role] $title"
done
