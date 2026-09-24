#!/usr/bin/env bash
# One-off: rewrite ALL history of the repo so no commit names a home directory.
#
#   bash tools/history-scrub/scrub-history.sh <username> [<username> ...]
#
# For each name: C:\Users\<name>\ (any slash form, and /c/Users/<name>/) becomes %USERPROFILE%,
# in every file of every commit and in every commit message. .claude/settings.json and
# settings.local.json (a contributor's allow-lists) are deleted from every commit. Commit hashes
# cited in the tree are then remapped on main (remap-hashes.py). The names are arguments so this
# script does not itself put them back into the repo.
#
# Needs: pip install git-filter-repo. Run from an EMPTY directory OUTSIDE the checkout.
# Precondition: the path scrub is already merged to main. Asks before force-pushing.
set -euo pipefail
[ $# -ge 1 ] || { echo "usage: $0 <username> [<username> ...]"; exit 2; }
HERE="$(cd "$(dirname "$0")" && pwd)"
REPO=https://github.com/darkbushido/The2ndChumming3e.git
NAMES="$(IFS='|'; echo "$*")"

: > replacements.txt
for n in "$@"; do
  printf '%s\n' "regex:(?i)[A-Za-z]:(\\\\\\\\|\\\\|/)+Users(\\\\\\\\|\\\\|/)+${n}(?=\\\\|/)==>%USERPROFILE%" >> replacements.txt
  printf '%s\n' "regex:(?i)/c/Users/${n}(?=/)==>%USERPROFILE%" >> replacements.txt
done

git clone --mirror "$REPO" scrub.git
cd scrub.git
git filter-repo --replace-text ../replacements.txt --replace-message ../replacements.txt \
  --invert-paths --path .claude/settings.json --path .claude/settings.local.json

# Verify: nothing left in any file of any commit, or in any message.
PAT="users[-\\\\/]+(${NAMES})"
if git log --all -p -i -G"$PAT" | grep -qiE "$PAT"; then echo "LEFT IN CONTENT"; exit 1; fi
if [ -n "$(git log --all -i -E --grep="$PAT" --format=%h)" ]; then echo "LEFT IN MESSAGES"; exit 1; fi
echo "clean. old->new SHAs in filter-repo/commit-map"

# Commit hashes cited in the docs (TODO ✅ headings, audits) now name commits that no longer
# exist. Remap them on main, from the commit-map, as one new commit.
cd ..
git clone -q scrub.git work
( cd work
  git checkout -q main
  python3 "$HERE/remap-hashes.py" ../scrub.git/filter-repo/commit-map
  if ! git diff --quiet; then
    git diff --stat
    git commit -qam "Remap commit hashes cited in docs after the history rewrite"
    git push -q origin main
  fi )
cd scrub.git

# filter-repo drops the remote; put it back and force-push every branch and tag.
git remote add origin "$REPO"
read -rp "Force-push ALL branches and tags to $REPO? [yes/N] " ok
[ "$ok" = yes ] || exit 0
# Not --mirror: GitHub refuses writes to refs/pull/*.
git push --force origin "refs/heads/*:refs/heads/*"
git push --force origin "refs/tags/*:refs/tags/*"
