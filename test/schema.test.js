describe('Schema()', function(){
    it('should create a new Schema object given arguments', function(){
        var schema = Schema.parse("string");
        schema.should.be.an.instanceof(PrimitiveSchema);
        schema.should.be.an.instanceof(Schema); // its baseclass
        schema.type.should.equal("string");
    });
    describe('parse()', function(){
        it('should throw an error if no arguments are provided', function(){
            (function() {
                Schema.parse();
            }).should.throwError();
        });
        it('should return a PrimitiveSchema if any of the primitive types are passed as schema arguments or as a type property', function(){
            var primitives = ['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string'];
            _.each(primitives, function(type) {
                var schema = Schema.parse(type);
                schema.should.be.an.instanceof(PrimitiveSchema);
                schema.type.should.equal(type);
                schema = Schema.parse({ "type": type });
                schema.should.be.an.instanceof(PrimitiveSchema);
                schema.type.should.equal(type);
            });
        });
        it('should throw an error is an unrecognized primitive type is provided', function(){
            (function() {
                Schema.parse("unrecognized");
            }).should.throwError();
            (function() {
                Schema.parse({"type":"unrecognized"});
            }).should.throwError();
        })
        it('should return a UnionSchema if an array is passed as a type', function(){
            var schema = Schema.parse(["string", "int", "null"]);
            schema.should.be.an.instanceof(UnionSchema);
            schema.type.should.equal("union");
        });
        it('should throw an error if an empty array of unions is passed', function(){
            (function() {
                var schema = Schema.parse([]);
            }).should.throwError();
        })
        it('should return a RecordSchema if an object is passed with a type "record"', function(){
            var schema = Schema.parse({
                name: "myrecord",
                type: "record",
                fields: [
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
                ]
            });
            schema.should.be.an.instanceof(RecordSchema);
            schema.type.should.equal("record");
            schema.fields.should.be.an.instanceof(Object);
            _.size(schema.fields).should.equal(3);
        });
        it('should return a MapSchema if an object is passed with a type "map"', function(){
            var schema = Schema.parse({
                "name": "mapSchemaTest",
                "type": {
                    "type": "map",
                    "values": "bytes"
                }
            });
            schema.should.be.an.instanceof(MapSchema);
            schema.values.should.be.an.instanceof(PrimitiveSchema);
            schema.values.type.should.equal("bytes");
            schema.type.should.equal("map");
        });
        it('should return an ArraySchema is an object is passed with a type "array"', function(){
            var schema = Schema.parse({
                "name": "arraySchemaTest",
                "type": "array",
                "items": "long"
            });
            schema.should.be.an.instanceof(ArraySchema);
            schema.items.should.be.an.instanceof(PrimitiveSchema);
            schema.type.should.equal("array");
        });
        it('should return a FixedSchema if an object is passed with a type "fixed"', function(){
            var schema = Schema.parse({
                "name": "fixedSchemaTest",
                "type": {
                    "type": "fixed",
                    "size": 50
                }
            });
            schema.should.be.an.instanceof(FixedSchema);
            schema.size.should.equal(50);
            schema.type.should.equal("fixed");
        });
        it('should return a EnumSchema if an object is passed with a type "enum"', function(){
            var schema = Schema.parse({
                "type": "enum",
                "symbols": [ "Alpha", "Bravo", "Charlie", "Delta"]
            });
            schema.should.be.an.instanceof(EnumSchema);
            schema.symbols.should.have.length(4);
            schema.type.should.equal("enum");
        })
        it('should allow for self references by name for non-primitive data types', function() {
            var schema = Schema.parse({
                "name": "document",
                "type": [
                    {
                        "type": "record",
                        "name": "Document",
                        "fields": [
                            {
                                "name": "test",
                                "type": [
                                    "null",
                                    "string"
                                ]
                            }
                        ]
                    },
                    {
                        "type": "record",
                        "name": "Fax",
                        "fields": [
                            {
                              "name": "data",
                              "type": [
                                "null",
                                "Document"
                              ],
                              "default": null
                            }
                        ]
                    }
                ]
            });

            // Ensure that the the reference to the non-primitive type 'Document'
            // in the second element of the type array now has the value of the
            // original 'Document'
            var original = schema.schemas[0];
            var selfReferenced = schema.schemas[1].fields[0].type.schemas[1].type;
            selfReferenced.should.equal(original);
        });
        // This test is disabled due to the current inability to do a late
        // checking. In this case we would desire the first reference to
        // Document not initially fail. It would wait until it has reached a
        // definition for Document or fail when it reaches the end of the schema
        it.skip('should allow for self references that are defined later', function() {
            var schema = Schema.parse({
                "name": "document",
                "type": [
                    {
                        "type": "record",
                        "name": "Fax",
                        "fields": [
                            {
                              "name": "data",
                              "type": [
                                "null",
                                "Document"
                              ],
                              "default": null
                            }
                        ]
                    },
                    {
                        "type": "record",
                        "name": "Document",
                        "fields": [
                            {
                                "name": "test",
                                "type": [
                                    "null",
                                    "string"
                                ]
                            }
                        ]
                    }
                ]
            });

            // Ensure that the the reference to the non-primitive type 'Document'
            // in the second element of the type array now has the value of the
            // original 'Document'
            var original = schema.schemas[0];
            var selfReferenced = schema.schemas[1].fields[0].type.schemas[1].type;
            selfReferenced.should.equal(original);
        });
    })
});
