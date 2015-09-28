var MetaScript = require("../node_modules/metascript/MetaScript.js"),
    path = require("path"),
    fs = require("fs");

var rootDir = path.join(__dirname, ".."),
    srcDir = path.join(rootDir, "node_modules/bytebuffer/src"),
    distDir = path.join(rootDir, "dist"),
    pkg = require(path.join(rootDir, "node_modules/bytebuffer/package.json")),
    filename;

var scope = {
    NODE:       false,
    DATAVIEW:   false,
    BUFFERVIEW: false,
    VERSION    : pkg.version,           // Version
    // Encodings
    ENCODINGS  : true,                  // Include encodings in general (catches all)
    BASE64     : false,                  // Include base64 encoding
    BINARY     : true,                  // Include binary encoding
    DEBUG      : false,                  // Include debug encoding
    HEX        : false,                  // Include hex encoding
    UTF8       : true,                  // Include utf8 encoding (required for STRINGS)
    // Primitive types
    BYTES      : true,                  // Include bytes
    INTS       : true,                  // Include int types in general (catches all)
    INT8       : true,                  // Include int8/uint8
    INT16      : false,                  // Include int16/uint16
    INT32      : false,                  // Include int32/uint32
    INT64      : true,                  // Include int64/uint64 with Long.js

    FLOATS     : true,                  // Include float types in general (catches all)
    FLOAT32    : true,                  // Include float32
    FLOAT64    : true,                  // Include float64
    // Varint encoding
    VARINTS    : true,                  // Include varint encoding in general (catches all)
    VARINT32   : false,                  // Include varint32/zigZagVarint32
    VARINT64   : true,                  // Include varint64/zigZagVarint32 with Long.js
    // String support
    STRINGS    : true,                  // Include string support in general (catches all)
    UTF8STRING : true,                  // Include UTF8 encoded strings
    CSTRING    : false,                  // Include C-like null terminated strings
    VSTRING    : false,                  // Include varint32 length prefixed strings
    ISTRING    : false,                  // Include uint32 length prefixed strings
    // Other
    ALIASES    : true,                  // Include aliases like writeByte, writeShort ..
    INLINE     : false,                  // Inline any assertion code ---> true longer, false more efficient
    VERBOSE_MS : false                  // Include MetaScript details as comments
};


console.log("Building ByteBuffer with scope", JSON.stringify(scope, null, 2));
fs.writeFileSync(
  path.join(distDir, "byteBuffer.js"),
  MetaScript.transform(fs.readFileSync(filename = path.join(rootDir, "scripts", "wrap.js")), filename, scope)
);
