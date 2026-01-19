#!/usr/bin/env bash
if [[ ${TERM} == "" || ${TERM} == "dumb" ]]; then
    RED=""
    GREEN=""
    GREY=""
    YELLOW=""
    RESET=""
else
    RED=`tput setaf 1`
    GREEN=`tput setaf 2`
    GREY=`tput setaf 7`
    YELLOW=`tput setaf 3`
    RESET=`tput sgr0`
fi

set -e
CLI_HOME="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Clean up any CubeJS cache files that might cause ENOENT errors
printf "${YELLOW}Cleaning up CubeJS cache files...${RESET}\n"
find $CLI_HOME/../libs -name ".cubestore" -type d -exec rm -rf {} + 2>/dev/null || true

FLAGS=$1
N=1  # sequential installation to avoid npm registry issues

printf '%s\0' $CLI_HOME/../libs/*/ | xargs -0 -n1 -P$N -I{} bash -c '
    export CI=true
    if [ -f "$0/package.json" ]; then
        lib=$(basename $0)
        printf "${YELLOW}Installing packages for library: $lib! $FLAGS${RESET}\n"
        (cd $0 && pnpm install $FLAGS --frozen-lockfile) || (cd $0 && pnpm install $FLAGS --frozen-lockfile)
    fi
' {}

printf '%s\0' $CLI_HOME/../archetypes/*/ | xargs -0 -n1 -P$N -I{} bash -c '
    export CI=true
    if [ -f "$0/package.json" ]; then
        archetype=$(basename $0)
        printf "${YELLOW}Installing packages for archetype: $archetype! $FLAGS${RESET}\n"
        (cd $0 && pnpm install $FLAGS --frozen-lockfile) || (cd $0 && pnpm install $FLAGS --frozen-lockfile)
    fi
' {}

printf "${GREEN}All library packages installed!${RESET}\n"
