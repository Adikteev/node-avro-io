#!/usr/bin/env bash

set -x
set -e

./scripts/clean.sh
./scripts/build_bytebuffer.sh


export COMPILATION_LEVEL="SIMPLE_OPTIMIZATIONS"

./scripts/build.sh
