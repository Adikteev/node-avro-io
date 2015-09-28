describe('IO', function(){
    describe('BinaryEncoder()', function(){
        var encoder, block;
        beforeEach(function(){
            block = new Block();
            encoder = BinaryEncoder(block);
        })
        afterEach(function(){
            encoder = null;
            block = null;
        })
        it('should throw an error if it is not passed an object to write to', function(){
            (function() {
                var invalidEncoder = BinaryEncoder();
            }).should.throwError();
        });
        it('should throw an error if the object passed in does not implement the write() method', function() {
            (function() {
                var dummyBlock = { write: 0 };
                var invalidEncoder = BinaryEncoder(dummyBlock);
            }).should.throwError();
        });
        describe('writeByte()', function(){
            it('should add a single octet to the buffer', function() {
                encoder.writeByte(50);
                blockAsBuffer(block)[0].should.equal(50);
                // Test high bit
                encoder.writeByte(250);
                blockAsBuffer(block)[1].should.equal(250);
            });
        });
        describe('writeNull()', function(){
            it('should not add anything to the buffer', function(){
                encoder.writeNull();
                block.offset().should.equal(0);
            });
        });
        describe('writeBoolean()', function(){
            it('should add 1 or 0 to the buffer', function(){
                encoder.writeBoolean(true);
                blockAsBuffer(block)[0].should.equal(1);
                encoder.writeBoolean(false);
                blockAsBuffer(block)[1].should.equal(0);
            });
        });
        describe('writeLong()', function(){
            it('should encode a long using zig-zag encoding', function(){
                encoder.writeLong(4);
                blockAsBuffer(block)[0].should.equal(8);
                encoder.writeLong(138);
                blockAsBuffer(block)[1].should.equal(148);
                blockAsBuffer(block)[2].should.equal(2);
            });

            // http://lucene.apache.org/core/3_5_0/fileformats.html#VInt
            it('should encode a long using variable-leng + zigzag encoding', function(){
                encoder.writeLong(1425253517632);

                blockAsBuffer(block)[0].should.equal(128);
                blockAsBuffer(block)[1].should.equal(165);
                blockAsBuffer(block)[2].should.equal(214);
                blockAsBuffer(block)[3].should.equal(251);
                blockAsBuffer(block)[4].should.equal(250);
                blockAsBuffer(block)[5].should.equal(82);
            });
        });
        describe('writeFloat()', function(){
            it('should encode a 32bit float in 4 bytes using java floatToIntBits method', function(){
                encoder.writeFloat(1.3278991);
                assertBufferContent(block, [0x99, 0xf8, 0xa9, 0x3f])
            });
        });
        describe('writeDouble()', function(){
            it('should encode a 64bit float in 8 bytes using java doubleToLongBits method', function() {
                encoder.writeDouble(8.98928196620122323);
                assertBufferContent(block,[0xb3, 0xb6, 0x76, 0x2a, 0x83, 0xfa, 0x21, 0x40]);
            });
        });
        describe('writeBytes()', function(){
            it('should be encoded as a long followed by that many bytes of data', function(){
                var testBytes = [255, 1, 254, 2, 253, 3];
                encoder.writeBytes(testBytes);
                blockAsBuffer(block)[0].should.equal(testBytes.length * 2);
                blockAsBuffer(block)[5].should.equal(253);
            });
            it('should throw an error if a buffer or array is not provided', function(){
                (function() {
                    encoder.writeBytes(4);
                }).should.throwError();
            })
        });
        describe('writeString()', function(){
            it('should be encoded as a long followed by that many bytes of UTF8 encoded character data', function(){
                // Test UTF8 characters as well as normal
                var testString = "\u00A9 all rights reserved";
                encoder.writeString(testString);
                assertBufferContent(block, [0x2c, 0xc2, 0xa9, 0x20, 0x61, 0x6c, 0x6c, 0x20,
                     0x72, 0x69, 0x67, 0x68, 0x74, 0x73, 0x20, 0x72, 0x65, 0x73, 0x65, 0x72, 0x76,
                     0x65, 0x64])
            });
            it('should throw an error if is not passed a string', function(){
                (function() {
                    encoder.writeString(21);
                }).should.throwError();
            })
        });
    });
    describe('BinaryDecoder()', function(){
        var decoder, block;
        beforeEach(function(){
            block = new Block();
            decoder = BinaryDecoder(block);
        })
        afterEach(function(){
            block = null;
            decoder = null;
        })
        it('should throw an error if the constructor is not passed an input object', function(){
            (function() {
                var invalidDecoder = BinaryDecoder();
            }).should.throwError();
        });
        it('should throw an error if the constructor is not passed an input object that implements the read method', function(){
            (function() {
                var dummyBlock = { read: false };
                var invalidDecoder = BinaryDecoder(dummyBlock);
            }).should.throwError();
        });
        describe('readNull()', function(){
            it('should decode and return a null', function(){
                should.not.exist(decoder.readNull());
            });
        });
        describe('readByte()', function(){
            it('should decode and return an octet from the current position of the buffer', function(){
                writeBytesArrayInBlock(block, [0x55]);

                decoder.readByte().should.equal(0x55);
            })
        })
        describe('readBoolean()', function(){
            it('should decode and return true or false', function(){
                writeBytesArrayInBlock(block, [0x01, 0x00]);
                decoder.readBoolean().should.be.true;
                decoder.readBoolean().should.be.false;
            })
        })
        describe('readLong()', function(){
            it('should decode and return a long', function(){
                writeBytesArrayInBlock(block, [0x94, 0x02]);

                decoder.readLong().should.equal(138);
            })
        })
        describe('readFloat()', function(){
            it('should decode and return a 32bit float', function(){
                writeBytesArrayInBlock(block, [0x99, 0xf8, 0xa9, 0x3f]);
                decoder.readFloat().toFixed(7).should.equal('1.3278991');
            })
        })
        describe('readDouble()', function(){
            it('should decode and return a 64bit float', function(){
                writeBytesArrayInBlock(block, [0xb3, 0xb6, 0x76, 0x2a, 0x83, 0xfa, 0x21, 0x40]);
                decoder.readDouble().should.equal(8.98928196620122323);
            })
        })
        describe('readFixed()', function(){
            it('should decode and return a fixed number of bytes', function(){
                writeBytesArrayInBlock(block, [0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC]);
                _.isEqual(decoder.readFixed(8), [0x55, 0x66, 0x77, 0x88, 0x99, 0xAA, 0xBB, 0xCC]).should.be.true;
            })
        })
        describe('readBytes()', function(){
            it('should decode and return a set of bytes', function(){
                writeBytesArrayInBlock(block, [0x08, 0x11, 0x22, 0x33, 0x44]);
                _.isEqual(decoder.readBytes(), [0x11, 0x22, 0x33, 0x44]).should.be.true;
            })
        })
        describe('readString()', function(){
            it('should decode and return a string', function(){
                writeBytesArrayInBlock(block, [0x2c, 0xc2, 0xa9, 0x20, 0x61, 0x6c, 0x6c, 0x20,
                     0x72, 0x69, 0x67, 0x68, 0x74, 0x73, 0x20, 0x72, 0x65, 0x73, 0x65, 0x72, 0x76,
                     0x65, 0x64]);

                var result = decoder.readString();
                expect(result).to.equal("\u00A9 all rights reserved");
            })
        })
        describe('skipNull()', function(){
            it('should be a no op since nulls are encoded a nothing', function(){
                writeBytesArrayInBlock(block, [1]);

                block._buffer.offset.should.equal(0);
                decoder.skipNull();
                block._buffer.offset.should.equal(0);
            })
        })
        describe('skipBoolean()', function(){
            it('should skip a reading by 1 byte', function(){
                writeBytesArrayInBlock(block, [1]);

                decoder.skipBoolean();
                block._buffer.offset.should.equal(1);
            });
        })
        describe('skipLong()', function(){
            it('should skip n bytes of a long encoded with zigzag encoding', function(){
                block._buffer.writeByte(0x94);
                block._buffer.writeByte(0x02);
                block._buffer.clear();

                block._buffer.offset.should.equal(0);
                decoder.skipLong();
                block._buffer.offset.should.equal(2);
            })
        })
        describe('skipFloat()', function(){
            it('should skip 4 bytes of an encoded float', function(){
                writeBytesArrayInBlock(block, [0x40, 0x50, 0x60, 0x70]);

                block._buffer.offset.should.equal(0);
                decoder.skipFloat();
                block._buffer.offset.should.equal(4);
            })
        })
        describe('skipDouble()', function(){
            it('should skip 8 bytes of an encoded double', function(){
                writeBytesArrayInBlock(block, [0x40, 0x50, 0x60, 0x70, 0x80, 0x90, 0xA0, 0xB0]);

                block._buffer.offset.should.equal(0);
                decoder.skipDouble();
                block._buffer.offset.should.equal(8);
            })
        })
        describe('skipBytes()', function(){
            it('should ', function(){
                writeBytesArrayInBlock(block, [0x04, 0x64, 0x40])

                block._buffer.offset.should.equal(0);
                decoder.skipBytes();
                block._buffer.offset.should.equal(3);
            })
        })
        describe('skipString()', function(){
            it('should skip a long followed by that many bytes', function(){
                writeBytesArrayInBlock(block, [0x04, 0x4F, 0x4B]);

                block._buffer.offset.should.equal(0);
                decoder.skipString();
                block._buffer.offset.should.equal(3);
            });
            it('should skip a long followed by a UTF-8 encoded string', function(){
                writeBytesArrayInBlock(block, [0x0c, 0xc2, 0xa9, 0x20, 0x61, 0x6c, 0x6c]);

                block._buffer.offset.should.equal(0);
                decoder.skipString();
                block._buffer.offset.should.equal(7);
            });
        })
    })
    describe('DatumWriter()', function() {
        it('should be initiated and store a schema', function(){
            var schema = Schema.parse("long");
            var writer = DatumWriter(schema);
            writer.writersSchema.should.equal(schema);
        })
        describe('writeFixed()', function(){
            it('should add a series of bytes specified by the schema', function(){
                var schema = Schema.parse({
                    "type": "fixed",
                    "name": "telephone",
                    "size": 10
                });
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var testString = "1234567890";
                writer.writeFixed(schema, testString, encoder);

                block._buffer.toUTF8(0, block._buffer.offset).should.equal(testString);
            })
        });
        describe('writeEnum()', function(){
            it('should write an eneration encoded by its index', function(){
                var schema = Schema.parse({
                    "type": "enum",
                    "name": "phonetics",
                    "symbols": [ "Alpha", "Bravo", "Charlie", "Delta"]
                });
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                writer.writeEnum(schema, "Charlie", encoder);
                writer.writeEnum(schema, "Delta", encoder);

                block._buffer.clear();

                blockAsBuffer(block)[0].should.equal(4);
                blockAsBuffer(block)[1].should.equal(6);
            });
        });
        describe('writeArray()', function(){
            it('should encode an array as a series of blocks, each block consists of a long count value, followed by that many array items, a block with count zero indicates the end of the array', function(){
                var schema = Schema.parse({
                    "type": "array",
                    "items": "long"
                });
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var testArray = [10, 20, 30, 40, 50];
                writer.writeArray(schema, testArray, encoder);

                block._buffer.clear();

                assertBufferContent(block, [testArray.length * 2, 20, 40, 60, 80, 100, 0]);
            })
        });
        describe('writeMap()', function(){
            it('should write a map encoded as a series of blocks, each block consists of a long count, followed by that many key/value pairs, a block count of 0 indicates the end of the map', function(){
                var schema = Schema.parse({
                    "name": "headers",
                    "type": {
                        "type": "map",
                        "values": "string"
                    }
                });
                var data = {
                    "user-agent": "firefox",
                    "remote-ip": "10.0.0.0",
                    "content-type": "applicaiton/json"
                }
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                writer.writeMap(schema, data, encoder);

                block._buffer.clear();

                var i = 0;
                blockAsBuffer(block)[i++].should.equal(_.size(data) * 2); // zig-zag encoding
                _.each(data, function(value, key) {
                    blockAsBuffer(block)[i++].should.equal(key.length * 2); // zig-zag encoding
                    block._buffer.slice(i,i + key.length).toUTF8().should.equal(key);
                    i += key.length;
                    blockAsBuffer(block)[i++].should.equal(value.length * 2); // zig-zag encoding
                    block._buffer.slice(i,i + value.length).toUTF8().should.equal(value);
                    i += value.length;
                })
            });
        });
        describe('writeUnion()', function(){
            it('should encode a union by first writing a long value indicating the zero-based position within the union of the schema of its value, followed by the encoded value according to that schema', function(){
                var schema = Schema.parse([ "string", "int" ]);
                var data = "testing a union";
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);

                writer.writeUnion(schema, data, encoder);
                blockAsBuffer(block)[0].should.equal(0);
                blockAsBuffer(block)[1].should.equal(data.length * 2);
                block._buffer.toUTF8(2, 17).should.equal(data);

                block._buffer.clear();
                writer.writeUnion(schema, 44, encoder);
                blockAsBuffer(block)[0].should.equal(2);
                blockAsBuffer(block)[1].should.equal(44 * 2);
            });
        });
        describe('writeRecord()', function(){
            it('should encode a record by encoding the values of its fields in the order that they are declared', function(){
                var schema = Schema.parse({
                    "name": "user",
                    "type": "record",
                    "fields": [
                        {"name":"firstName","type": "string"},
                        {"name":"lastName","type": "string"},
                        {"name":"age","type": "int"}
                    ]
                });
                var data = {
                    "firstName": "bob",
                    "lastName": "the_builder",
                    "age": 40
                }
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                writer.writeRecord(schema, data, encoder);
                blockAsBuffer(block)[0].should.equal(data.firstName.length * 2); // zig-zag encoding
                block._buffer.slice(1,4).toUTF8().should.equal(data.firstName);
                blockAsBuffer(block)[4].should.equal(data.lastName.length * 2); // zig-zag encoding
                block._buffer.slice(5,16).toUTF8().should.equal(data.lastName);
                blockAsBuffer(block)[16].should.equal(data.age * 2);
            })
        });

        describe('bad writeRecord()', function(){
            it('should encode a record by encoding the values of its fields in the order that they are declared', function(){
                var schema = Schema.parse({
                    "name": "user",
                    "type": "record",
                    "fields": [
                        {"name":"firstName","type": "string"},
                        {"name":"lastName","type": "string"},
                        {"name":"nest","type": {
                            "name":"nest",
                            "type": "record",
                            "fields": [{"name":"nField","type": "int"}]
                        }},
                        {"name":"age","type": "int"}
                    ]
                });
                var data = {
                    "firstName": "bob",
                    "lastName": "the_builder",
                    "nest": {nField: "badString"},
                    "extra": "foo",
                    "age": 40
                }
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var thrown = false;
                try {
                    writer.writeRecord(schema, data, encoder);
                } catch (err){
                    thrown = true;
                }

                thrown.should.equal(true);
            })
        });

        describe('write()', function(){
            it('should encode an int/long with zig-zag encoding', function() {
                var schema = Schema.parse({
                    "type": "int"
                });
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                writer.write(-64, encoder);
                blockAsBuffer(block)[0].should.equal(127);
            });
            it('should encode a string as a long of its length, followed by the utf8 encoded string', function(){
                var schema = Schema.parse({
                    "type": "string"
                });
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                writer.write("testing", encoder);

                block._buffer.toUTF8(0, block._buffer.offset).should.equal("\u000etesting");
            });
            it('should encode a record as the values of its fields in the order of declaration', function(){
                var schema = Schema.parse({
                    "type" : "record",
                    "name" : "IntStringRecord",
                    "fields" : [ { "name" : "intField", "type" : "int" },
                                 { "name" : "stringField", "type" : "string" }]
                });
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var record = {
                    intField: 1,
                    stringField: "abc"
                };
                writer.write(record, encoder);

                block._buffer.toUTF8(0, block._buffer.offset).should.equal("\u0002\u0006abc");
            });
            it('should encode a union as a long of the zero-based schema position, followed by the value according to the schema at that position', function(){
                var schema = Schema.parse([
                    "int",
                    "string",
                    "null"
                ]);
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var record = "test";

                writer.write(record, encoder);
                block._buffer.toUTF8(0, block._buffer.offset).should.equal("\u0002\u0008test");

                var record = null;
                block._buffer.clear();
                writer.write(record, encoder);
                blockAsBuffer(block)[0].should.equal(4);
            });
            it('should encode a union of a enum with null type and enum', function(){
                var schema = Schema.parse(
                            [
                                "null",
                                {
                                    "type"   : "enum",
                                    "name"   : "a_enum",
                                    "symbols": ["enum_1", "enum_2"]
                                }
                            ]
                    );
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var record = "enum_1";

                writer.write(record, encoder);
                block._buffer.toUTF8(0, block._buffer.offset).should.equal("\u0002\u0000");

                var record = null;
                block._buffer.clear();
                writer.write(record, encoder);
                blockAsBuffer(block)[0].should.equal(0);
            });
            it('should encode a union of a array with null type and enum', function(){
                var schema = Schema.parse(
                    [
                        {
                            "type": "array",
                            "items": "string"
                        },
                        "null"
                    ]
                );
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var record = ['testStr'];
                writer.write(record, encoder);
                assertBufferContent(block, [0,2,14,116,101,115,116,83,116,114,0]);

                var record = null;
                block._buffer.clear();
                writer.write(record, encoder);
                blockAsBuffer(block)[0].should.equal(2);
            });
            it('should encode a union of a array with null type and object', function () {
                var schema = Schema.parse(
                    [
                        "null",
                        {
                            "type": "record",
                            "name": "nested_record",
                            "fields": [
                                {"name": "field1", "type": ["string", "null"], "default": ""},
                                {"name": "field2", "type": ["int", "null"], "default": 0}
                            ]
                        }
                    ]
                );
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var record = {
                    "field1": "data1",
                    "field2": 23
                };
                writer.write(record, encoder);
                assertBufferContent(block, [2, 0, 10, 100, 97, 116, 97, 49, 0, 46]);

                block._buffer.clear();

                var record = null;
                writer.write(record, encoder);
                blockAsBuffer(block)[0].should.equal(0);
            });

            it('should encode a nested schema', function() {
                var schema = Schema.parse({
                    "fields": [
                        {
                            "name": "host",
                            "type": "string"
                        },
                        {
                            "name": "time",
                            "type": "string"
                        },
                        {
                            "name": "elapsedTime",
                            "type": "long"
                        },
                        {
                            "name": "request",
                            "type": {
                                "name": "Request",
                                "type": "record",
                                "fields": [
                                    {
                                        "name": "headers",
                                        "type": {
                                            "type": "map",
                                            "values": "string"
                                        }
                                    },
                                    {
                                        "name": "method",
                                        "type": "string"
                                    },
                                    {
                                        "name": "path",
                                        "type": "string"
                                    },
                                    {
                                        "name": "queryString",
                                        "type": [
                                            "string",
                                            "null"
                                        ]
                                    },
                                    {
                                        "name": "body",
                                        "type": {
                                            "type": "map",
                                            "values": "string"
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            "name": "exception",
                            "type": [
                                {
                                    "fields": [
                                        {
                                            "name": "class",
                                            "type": "string"
                                        },
                                        {
                                            "name": "message",
                                            "type": "string"
                                        },
                                        {
                                            "name": "stackTrace",
                                            "type": [
                                                "null",
                                                "string"
                                            ]
                                        }
                                    ],
                                    "name": "AppException",
                                    "type": "record"
                                },
                                "null"
                            ]
                        }
                    ],
                    "name": "LogEvent",
                    "namespace": "e.d.c.b.a",
                    "type": "record"
                });
                var block = new Block();
                var writer = DatumWriter(schema);
                var encoder = BinaryEncoder(block);
                var log = {
                    host: "testhostA",
                    time: "1970-01-01T00:00Z",
                    elapsedTime: 123456789,
                    request: {
                        headers: {
                            "user-agent": "firefox",
                            "remote-ip": "0.0.0.0"
                        },
                        method: "GET",
                        path: "/basepath/object",
                        queryString: "param1=test1&param2=test2",
                        body: {}
                    },
                    exception: {
                        "class": "org.apache.avro",
                        message: "An error occurred",
                        stackTrace: "failed at line 1"
                    }
                }
                writer.write(log, encoder);
                assertBufferContent(block, [0x12, 0x74, 0x65, 0x73, 0x74,
                                            0x68, 0x6f, 0x73, 0x74, 0x41, 0x22, 0x31, 0x39,
                                            0x37, 0x30, 0x2d, 0x30, 0x31, 0x2d, 0x30, 0x31,
                                            0x54, 0x30, 0x30, 0x3a, 0x30, 0x30, 0x5a, 0xaa,
                                            0xb4, 0xde, 0x75, 0x04, 0x14, 0x75, 0x73, 0x65,
                                            0x72, 0x2d, 0x61, 0x67, 0x65, 0x6e, 0x74, 0x0e,
                                            0x66, 0x69, 0x72, 0x65, 0x66, 0x6f, 0x78, 0x12,
                                            0x72, 0x65, 0x6d, 0x6f, 0x74, 0x65, 0x2d, 0x69,
                                            0x70, 0x0e, 0x30, 0x2e, 0x30, 0x2e, 0x30, 0x2e,
                                            0x30, 0x00, 0x06, 0x47, 0x45, 0x54, 0x20, 0x2f,
                                            0x62, 0x61, 0x73, 0x65, 0x70, 0x61, 0x74, 0x68,
                                            0x2f, 0x6f, 0x62, 0x6a, 0x65, 0x63, 0x74, 0x00,
                                            0x32, 0x70, 0x61, 0x72, 0x61, 0x6d, 0x31, 0x3d,
                                            0x74, 0x65, 0x73, 0x74, 0x31, 0x26, 0x70, 0x61,
                                            0x72, 0x61, 0x6d, 0x32, 0x3d, 0x74, 0x65, 0x73,
                                            0x74, 0x32, 0x00, 0x00, 0x1e, 0x6f, 0x72, 0x67,
                                            0x2e, 0x61, 0x70, 0x61, 0x63, 0x68, 0x65, 0x2e,
                                            0x61, 0x76, 0x72, 0x6f, 0x22, 0x41, 0x6e, 0x20,
                                            0x65, 0x72, 0x72, 0x6f, 0x72, 0x20, 0x6f, 0x63,
                                            0x63, 0x75, 0x72, 0x72, 0x65, 0x64, 0x02, 0x20,
                                            0x66, 0x61, 0x69, 0x6c, 0x65, 0x64, 0x20, 0x61,
                                            0x74, 0x20, 0x6c, 0x69, 0x6e, 0x65, 0x20, 0x31]);
            })
        });
    });
    describe('DatumReader()', function(){
        var block, decoder;
        beforeEach(function(){
            block = new Block();
            decoder = BinaryDecoder(block);
        });
        describe('read()', function(){
            it('should set the readersSchema to the writersSchema if readersSchema is null', function(){
                var schema = Schema.parse("int");
                var reader = DatumReader(schema, null);
                writeBytesArrayInBlock(block, [0x06]);
                var result = reader.read(decoder);
                expect(result).to.equal(3);
                reader.writersSchema.should.equal(reader.readersSchema);
            });
        });
        describe('readData()', function(){
            var schema = Schema.parse({
                "name": "testRecord",
                "type": "record",
                "fields": [
                    {"name":"testNull","type": "null"},
                    {"name":"testBoolean","type": "boolean"},
                    {"name":"testString","type": "string"},
                    {"name":"testInt","type": "int"},
                    {"name":"testLong","type": "long"},
                    {"name":"testFloat","type": "float"},
                    {"name":"testDouble","type": "double"},
                    {"name":"testBytes","type": "bytes"},
                    {"name":"testFixed","type": "fixed", "size": 5},
                    {"name":"testEnum","type": "enum", "symbols": ["Alpha", "Bravo", "Charlie", "Delta"]},
                    {"name":"testArray","type": "array", "items": "long"},
                    {"name":"testMap","type": { "type":"map", "values": "int"}},
                    {"name":"testUnion","type":["string", "int", "null"]}
                ]
            });
            schema.should.be.an.instanceof(RecordSchema);
            var reader = DatumReader(schema);
            var block = new Block();
            var decoder = BinaryDecoder(block);
            writeBytesArrayInBlock(block, [/*purposely blank*/
                                    0x01,
                                    0x08, 0x74, 0x65, 0x73, 0x74,
                                    0x08,
                                    0x94, 0x02,
                                    0x99, 0xf8, 0xa9, 0x3f,
                                    0xb3, 0xb6, 0x76, 0x2a, 0x83, 0xfa, 0x21, 0x40,
                                    0x0c, 0xF4, 0x44, 0x45, 0x7f, 0x28, 0x6C,
                                    0x19, 0x69, 0x29, 0x3f, 0xff,
                                    0x04,
                                    0x08, 0x14, 0x69, 0x10, 0xF1, 0x01, 0x00,
                                    0x06, 0x06, 0x6f, 0x6e, 0x65, 0x20, 0x06, 0x74, 0x77, 0x6f, 0x10, 0x0a, 0x74, 0x68, 0x72, 0x65, 0x65, 0x40, 0x00,
                                    0x04]);

            it('should read and decode a null', function(){
                var result = reader.readData(schema.fieldsHash["testNull"].type, null, decoder);
                expect(result).to.equal(null);
                block.offset().should.equal(0);
            });
            it('should read and decode a boolean', function(){
                var result = reader.readData(schema.fieldsHash["testBoolean"].type, null, decoder);
                expect(result).to.equal(true);
            });
            it('should read and decode a string', function(){
                var result = reader.readData(schema.fieldsHash["testString"].type, null, decoder);
                expect(result).to.equal("test");
            });
            it('should read and decode an int', function(){
                var result = reader.readData(schema.fieldsHash["testInt"].type, null, decoder);
                expect(result).to.equal(4);
            });
            it('should read and decode a long', function(){
                var result = reader.readData(schema.fieldsHash["testLong"].type, null, decoder);
                expect(result).to.equal(138);
            });
            it('should read and decode a float', function(){
                var result = reader.readData(schema.fieldsHash["testFloat"].type, null, decoder);
                result.toFixed(7).should.equal('1.3278991')
            });
            it('should read and decode a double', function(){
                var result = reader.readData(schema.fieldsHash["testDouble"].type, null, decoder);
                expect(result).to.equal(8.98928196620122323);
            });
            it('should read and decode bytes', function(){
                var result = reader.readData(schema.fieldsHash["testBytes"].type, null, decoder);
                _.isEqual(expect(result).to.equal[0xF4, 0x44, 0x45, 0x7f, 0x28, 0x6C]).should.be.true;
                result.length.should.equal(6);
            });
            it('should read and decode a fixed', function(){
                var result = reader.readData(schema.fieldsHash["testFixed"].type, null, decoder);
                _.isEqual(result, [0x19, 0x69, 0x29, 0x3f, 0xff]).should.be.true;
                result.length.should.equal(5);
            });
            it('should read and decode an enum', function(){
                var result = reader.readData(schema.fieldsHash["testEnum"].type, null, decoder);
                expect(result).to.equal("Charlie");
            });
            it('should read and decode an array', function(){
                var result = reader.readData(schema.fieldsHash["testArray"].type, null, decoder);
                expect(result).to.eql([10, -53, 8, -121]);
                result.length.should.equal(4);
            });
            it('should read and decode a map', function(){
                var result = reader.readData(schema.fieldsHash["testMap"].type, null, decoder);
                expect(result).to.have.property("one", 0x10);
                expect(result).to.have.property("two", 8);
                expect(result).to.have.property("three", 0x20);
                _.size(result).should.equal(3);
            });
            it('should read and decode a union', function(){
                var result = reader.readData(schema.fieldsHash["testUnion"].type, null, decoder);
                should.not.exist(result);
            });
            it('should read and decode a record', function(){
                block._buffer.clear();
                var result = reader.readData(schema, null, decoder);
                expect(result).to.have.property("testMap");
                var map = result.testMap;
                map.should.have.property("one", 0x10);
            });
            it('should throw an error if an unrecognized schema type is provided', function(){
                (function() {
                    reader.readData(schema.parse({"type":"invalid"}), null, decoder);
                }).should.throwError();
            });
            it('should throw an error if the writersSchema provided is not a Schema object', function(){
                (function() {
                    reader.readData("invalid", null, decoder);
                }).should.throwError();
            });
            it('should throw an error if the readersSchema provided is not a Schema object', function(){
                (function() {
                    reader.readData(schema.parse({"type":"string"}), "invalid", decoder);
                }).should.throwError();
            });
        })
        describe('readEnum()', function(){
            it('should decode and return an enumerated type', function(){
                var schema = Schema.parse({
                    "type": "enum",
                    "name": "phonetics",
                    "symbols": [ "Alpha", "Bravo", "Charlie", "Delta"]
                });
                var reader = DatumReader(schema);
                writeBytesArrayInBlock(block, [0x06]);
                reader.readEnum(schema, schema, decoder).should.equal("Delta");
            })
        })
        describe('readArray()', function(){
            it('should decode and return an array', function(){
                var schema = Schema.parse({
                    "type": "array",
                    "items": "string"
                });
                var data = ["apples", "banannas", "oranges", "pears", "grapes"];
                var reader = DatumReader(schema);
                writeBytesArrayInBlock(block, [0x0a, 0x0c, 0x61, 0x70, 0x70, 0x6c, 0x65, 0x73, 0x10, 0x62, 0x61,
                                        0x6e, 0x61, 0x6e, 0x6e, 0x61, 0x73, 0x0e, 0x6f, 0x72, 0x61, 0x6e,
                                        0x67, 0x65, 0x73, 0x0a, 0x70, 0x65, 0x61, 0x72, 0x73, 0x0c, 0x67,
                                        0x72, 0x61, 0x70, 0x65, 0x73, 0x00]);
                reader.readArray(schema, schema, decoder).should.eql(data);
            })
        })
        describe('readMap()', function(){
            it('should decode a map and return a json object containing the data', function(){
                var schema = Schema.parse({
                    "name": "headers",
                    "type": {
                        "type": "map",
                        "values": "string"
                    }
                });
                var data = [ 6, 20, 117, 115, 101, 114, 45, 97, 103, 101, 110, 116, 14, 102, 105, 114, 101,
                             102, 111, 120, 18, 114, 101, 109, 111, 116, 101, 45, 105, 112, 16, 49, 48, 46,
                             48, 46, 48, 46, 48, 24, 99, 111, 110, 116, 101, 110, 116, 45, 116, 121, 112,
                             101, 32, 97, 112, 112, 108, 105, 99, 97, 105, 116, 111, 110, 47, 106, 115, 111,
                             110, 0];
                writeBytesArrayInBlock(block, data);
                var reader = DatumReader(schema);
                var map = reader.readMap(schema, schema, decoder);
                map.should.have.property("user-agent", "firefox");
                map.should.have.property("remote-ip", "10.0.0.0");
                map.should.have.property("content-type", "applicaiton/json");
            });
        })
        describe('readUnion()', function(){
            it('should decode a union by returning the object specified by the schema of the unions index', function(){
                var schema = Schema.parse([
                    "int",
                    "string",
                    "null"
                ]);
                var reader = DatumReader(schema);
                writeBytesArrayInBlock(block, [0x02, 0x08, 0x74, 0x65, 0x73, 0x74]);
                var result = reader.readUnion(schema, schema, decoder);
                (result === "test").should.be.true;
            })
        })
        describe('readRecord()', function(){
            it('should decode a record and return a json object containing the data', function(){
                var schema = Schema.parse({
                    "name": "user",
                    "type": "record",
                    "fields": [
                        {"name":"firstName","type": "string"},
                        {"name":"lastName","type": "string"},
                        {"name":"age","type": "int"}
                    ]
                });
                writeBytesArrayInBlock(block, [0x06, 0x62, 0x6f, 0x62, 0x16, 0x74, 0x68, 0x65, 0x5f, 0x62, 0x75, 0x69, 0x6c, 0x64, 0x65, 0x72, 0x50]);
                var reader = DatumReader(schema);
                var record = reader.readRecord(schema, schema, decoder);
                record.should.have.property("firstName", "bob");
                record.should.have.property("lastName", "the_builder");
                record.should.have.property("age", 40);
            })
        });
        describe('skipData()', function(){
            var schema = Schema.parse({
                "name": "testRecord",
                "type": "record",
                "fields": [
                    {"name":"testNull","type": "null"},
                    {"name":"testBoolean","type": "boolean"},
                    {"name":"testString","type": "string"},
                    {"name":"testInt","type": "int"},
                    {"name":"testLong","type": "long"},
                    {"name":"testFloat","type": "float"},
                    {"name":"testDouble","type": "double"},
                    {"name":"testBytes","type": "bytes"},
                    {"name":"testFixed","type": "fixed", "size": 5},
                    {"name":"testEnum","type": "enum", "symbols": ["Alpha", "Bravo", "Charlie", "Delta"]},
                    {"name":"testArray","type": "array", "items": "long"},
                    {"name":"testMap","type": { "type":"map", "values": "int"}},
                    {"name":"testUnion","type":["string", "int", "null"]}
                ]
            });
            var reader = DatumReader(schema);
            var block = new Block();
            var decoder = BinaryDecoder(block);
            writeBytesArrayInBlock(block, [/*purposely blank*/
                                    0x01,
                                    0x08, 0x74, 0x65, 0x73, 0x74,
                                    0x08,
                                    0x94, 0x02,
                                    0x99, 0xf8, 0xa9, 0x3f,
                                    0xb3, 0xb6, 0x76, 0x2a, 0x83, 0xfa, 0x21, 0x40,
                                    0x0c, 0xF4, 0x44, 0x45, 0x7f, 0x28, 0x6C,
                                    0x19, 0x69, 0x29, 0x3f, 0xff,
                                    0x04,
                                    0x08, 0x14, 0x69, 0x10, 0xF1, 0x01, 0x00,
                                    0x06, 0x06, 0x6f, 0x6e, 0x65, 0x20, 0x06, 0x74, 0x77, 0x6f, 0x10, 0x0a, 0x74, 0x68, 0x72, 0x65, 0x65, 0x40, 0x00,
                                    0x04]);
            it('should skip a null', function(){
                reader.skipData(schema.fieldsHash["testNull"].type, decoder);
                block.offset().should.equal(0);
            });
            it('should skip a boolean', function(){
                reader.skipData(schema.fieldsHash["testBoolean"].type, decoder);
                block.offset().should.equal(1);
            });
            it('should skip a string', function(){
                reader.skipData(schema.fieldsHash["testString"].type, decoder);
                block.offset().should.equal(6);
            });
            it('should skip an int', function(){
                reader.skipData(schema.fieldsHash["testInt"].type, decoder);
                block.offset().should.equal(7);
            });
            it('should skip a long', function(){
                reader.skipData(schema.fieldsHash["testLong"].type, decoder);
                block.offset().should.equal(9);
            });
            it('should skip a float', function(){
                reader.skipData(schema.fieldsHash["testFloat"].type, decoder);
                block.offset().should.equal(13);
            });
            it('should skip a double', function(){
                reader.skipData(schema.fieldsHash["testDouble"].type, decoder);
                block.offset().should.equal(21);
            });
            it('should skip bytes', function(){
                reader.skipData(schema.fieldsHash["testBytes"].type, decoder);
                block.offset().should.equal(28);
            });
            it('should skip a fixed', function(){
                reader.skipData(schema.fieldsHash["testFixed"].type, decoder);
                block.offset().should.equal(33);
            });
            it('should skip an enum', function(){
                reader.skipData(schema.fieldsHash["testEnum"].type, decoder);
                block.offset().should.equal(34);
            });
            it('should skip an array', function(){
                reader.skipData(schema.fieldsHash["testArray"].type, decoder);
                block.offset().should.equal(41);
            });
            it('should skip a map', function(){
                reader.skipData(schema.fieldsHash["testMap"].type, decoder);
                block.offset().should.equal(60);
            });
            it('should skip a union', function(){
                reader.skipData(schema.fieldsHash["testUnion"].type, decoder);
                block.offset().should.equal(61);
            });
            it('should skip a record', function(){
                block._buffer.clear();
                reader.skipData(schema, decoder);
                block.offset().should.equal(61);
            });
        })
    })
})
