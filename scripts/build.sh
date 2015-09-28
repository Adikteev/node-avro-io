#!/usr/bin/env bash

set -x
set -e

java -jar ./scripts/compiler-latest/compiler.jar \
  --js ./node_modules/long/src/Long.js \
  --js ./dist/byteBuffer.js \
  --js ./lib/utils.js \
  --js ./lib/schema.js \
  --js ./lib/io.js \
  --js ./lib/block.js \
  --js ./lib/errors.js \
  --js ./lib/exports.js \
  --js_output_file ./dist/avro.min.js \
  --compilation_level $COMPILATION_LEVEL \
  --create_source_map ./dist/avro.min.map \
  --formatting=pretty_print \
  --language_in=ECMASCRIPT6 \
  --language_out=ECMASCRIPT5 \
  --output_wrapper "%output%
//# sourceMappingURL=avro.min.map"

ls -lh ./dist
