var util 		= require('util');
var _ 			= require('lodash');
var IO 			= require('./io');
var Avro 		= require('./schema');
var Block       = require('./block').Block;

// Constants
var VERSION = 1;
var SYNC_SIZE = 16;
var DEFAULT_BUFFER_SIZE = 8192;
var VALID_CODECS = ["null", "deflate", "snappy"];

function magic() {
    return "Obj" + String.fromCharCode(VERSION);
};

function metaSchema() {
    return Avro.Schema({
        "type": "record",
        "name": "org.apache.avro.file.Header",
        "fields" : [
            {
                "name": "magic",
                "type": {
                    "type": "fixed",
                    "name": "magic",
                    "size": magic().length
                }
            },
            {
                "name": "meta",
                "type": {
                    "type": "map",
                    "values": "string"
                }
            },
            {
                "name": "sync",
                "type": {
                    "type": "fixed",
                    "name": "sync",
                    "size": SYNC_SIZE
                }
            }
        ]
    });
};

function blockSchema() {
    return Avro.Schema({
        "type": "record", "name": "org.apache.avro.block",
        "fields" : [
            {"name": "objectCount", "type": "long" },
            {"name": "objects", "type": "bytes" },
            {"name": "sync", "type": {"type": "fixed", "name": "sync", "size": SYNC_SIZE}}
        ]
    });
};

