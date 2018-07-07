#!/usr/bin/env bash

set -e;

branch_type="${1:-feature}";
arr=('feature', 'bugfix', 'release');

if [[ "${arr[*]}" != *"$branch_type" ]]; then
    echo "Branch type needs to be either 'feature', 'bugfix' or 'release'."
    exit 1;
fi

git fetch origin
git checkout dev
git merge -Xignore-space-change origin/dev

time_millis=`node -e 'console.log(Date.now())'`;


exit 0;

echo "You are checking out a new $branch_type branch from the dev branch"
new_branch="${USER}/${branch_type}/${time_millis}"

echo "New branch name: $new_branch";

git checkout -b "${new_branch}"
git push -u origin HEAD  # makes sure git is tracking this branch on the primary remote
