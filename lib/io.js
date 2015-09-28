var BinaryDecoder = function(input) {
    if (!input || input == 'undefined') { throw new IOError('Must provide input'); }
    if ((this instanceof arguments.callee) === false) { return new arguments.callee(input); }

    this.input(input);
};

BinaryDecoder.prototype = {

    input: function(input) {
        if (!(input instanceof Block)) {
            throw new IOError("Must provide an input object instance of Block");
        }
        else {
            this._input = input;
        }
    },

    readNull: function () {
        // No bytes consumed
        return null;
    },

    readByte: function() {
        return this._input.readByte();
    },

    readBoolean: function () {
        var bool = this._input.readByte();
        // FIXME: return ByteBuffer error ?
        if (bool instanceof BlockDelayReadError)
            return bool;
        else
            return bool === 1 ? true : false;
    },

    readInt: function () {
        return this.readLong();
    },

    readLong: function () {
        return this._input.readVarint64ZigZag().toNumber();
    },

    readFloat: function() {
        return this._input.readFloat32();
    },

    // doubleToLongBits, little endian
    readDouble: function() {
        return this._input.readDouble();
    },

    readFixed: function(len) {
        if (len < 1) {
            throw new IOError(`readFixed only read ${len}`);
        } else {
            var res = [];
            for (var i = 0; i < len; i += 1) {
                res.push(this._input.readUint8());
            }
            return res;
        }
    },

    readBytes: function() {
        var len = this.readLong();
        if (len && len > 0) {
            var bytes = this.readFixed(len);
            return bytes;
        } else {
            return [];
        }
    },

    readString: function() {
        var len = this.readLong();
        return this._input.readUTF8String(len);
    },

    skipNull: function(){
        return;
    },

    skipBoolean: function() {
        return this._input.skip(1);
    },

    skipLong: function() {
        while((this.readByte() & 0x80) != 0) {}
    },

    skipFloat: function() {
        return this._input.skip(4);
    },

    skipDouble: function() {
        return this._input.skip(8);
    },

    skipFixed: function(len){
        return this._input.skip(len);
    },

    skipBytes: function() {
        var len = this.readLong();
        this._input.skip(len);
    },

    skipString: function() {
        this.skipBytes();
    }
}

var BinaryEncoder = function(output) {
    if (!(output instanceof Block))
        throw new IOError("Must provide an output object, instance of Block");

    if ((this instanceof arguments.callee) === false)
        return new arguments.callee(output);

    this.output(output);
};


BinaryEncoder.prototype = {

    output: function(output) {
        if (!(output instanceof Block))
            throw new IOError("Must provide an output object that is an instance of Block");
        else
            this._output = output;
    },

    writeByte: function(value){
        this._output.writeByte(value);
    },

    writeNull : function() {
        // This is a no-op
    },

    writeBoolean : function(value) {
        this._output.writeByte(value ? 1 : 0);
    },

    writeInt: function(value) {
        this.writeLong(value);
    },

    writeLong: function(value) {
        this._output.writeVarint64ZigZag(value);
    },

    writeFloat: function(value) {
        this._output.writeFloat32(value)
    },

    writeDouble: function(value) {
        this._output.writeDouble(value);
    },

    writeBytes: function(datum) {
        if (!Array.isArray(datum)) { throw new IOError("must pass in an array of byte values"); }

        var that = this;
        this.writeLong(datum.length);
        datum.forEach(function(b){ that.writeByte(b); });
    },

    writeString: function(datum) {
        if (!_.isString(datum)){
            throw new IOError(`argument must be a string but was ${JSON.stringify(datum)} (${typeof(datum)})`);
        }
        bytes = ByteBuffer.calculateUTF8Bytes(datum);
        this.writeLong(bytes);
        this._output.writeUTF8String(datum); // will be encoded from UTF16 to UTF8
    }
}

var DatumReader = function(writersSchema, readersSchema) {

    if ((this instanceof arguments.callee) === false)
        return new arguments.callee(writersSchema, readersSchema);

    this.writersSchema = writersSchema;
    this.readersSchema = readersSchema;
};

DatumReader.prototype = {

    read: function(decoder){
        if (!this.readersSchema) this.readersSchema = this.writersSchema;
        return this.readData(this.writersSchema, this.readersSchema, decoder);
    },

    readData: function(writersSchema, readersSchema, decoder) {

        // if (!(writersSchema instanceof Schema))
        //     throw new IOError("writersSchema is not a valid schema object");

        // if (readersSchema && !(readersSchema instanceof Schema))
        //     throw new IOError("readersSchema is not a valid schema object");

        if (!readersSchema) readersSchema = writersSchema;

        switch(writersSchema.type) {
            case "null":    return decoder.readNull(); break;
            case "boolean": return decoder.readBoolean(); break;
            case "string":  return decoder.readString(); break;
            case "int":     return decoder.readInt(); break;
            case "long":    return decoder.readLong(); break;
            case "float":   return decoder.readFloat(); break;
            case "double":  return decoder.readDouble(); break;
            case "bytes":   return decoder.readBytes(); break;
            case "fixed":   return decoder.readFixed(writersSchema.size); break;
            case "enum":    return this.readEnum(writersSchema, readersSchema, decoder); break;
            case "array":   return this.readArray(writersSchema, readersSchema, decoder); break;
            case "map":     return this.readMap(writersSchema, readersSchema, decoder); break;
            case "union":   return this.readUnion(writersSchema, readersSchema, decoder); break;
            case "record":
            case "errors":
            case "request": return this.readRecord(writersSchema, readersSchema, decoder); break;
            default:
                throw new IOError(`Unknown type: ${writersSchema}`);
        }
    },

    skipData: function(writersSchema, decoder) {

        if (!(writersSchema instanceof Schema))
            throw new IOError("writersSchema is not a valid schema object");

        switch(writersSchema.type) {
            case "null":    return decoder.skipNull(); break;
            case "boolean": return decoder.skipBoolean(); break;
            case "string":  return decoder.skipString(); break;
            case "int":     return decoder.skipLong(); break;
            case "long":    return decoder.skipLong(); break;
            case "float":   return decoder.skipFloat(); break;
            case "double":  return decoder.skipDouble(); break;
            case "bytes":   return decoder.skipBytes(); break;
            case "fixed":   return decoder.skipFixed(writersSchema.size); break;
            case "enum":    return this.skipEnum(writersSchema, decoder); break;
            case "array":   return this.skipArray(writersSchema, decoder); break;
            case "map":     return this.skipMap(writersSchema, decoder); break;
            case "union":   return this.skipUnion(writersSchema, decoder); break;
            case "record":
            case "errors":
            case "request": return this.skipRecord(writersSchema, decoder); break;
            default:
                throw new IOError(`Unknown type: ${writersSchema}`);
        }
    },

    readEnum: function(writersSchema, readersSchema, decoder) {
        var anEnum = decoder.readInt();
        if (anEnum instanceof BlockDelayReadError)
            return anEnum;
        var symbolIndex = Math.abs(anEnum);
        if (symbolIndex > 0 && symbolIndex < writersSchema.symbols.length)
            return writersSchema.symbols[symbolIndex];
    },

    skipEnum: function(writersSchema, decoder) {
        return decoder.skipLong();
    },

    readArray: function(writersSchema, readersSchema, decoder) {
        var self = this;
        var anArray = [];
        this.readBlocks(decoder, function() {
            anArray.push(self.readData(writersSchema.items, readersSchema.items, decoder));
        })
        return anArray;
    },

    skipArray: function(writersSchema, decoder) {
        var self = this;
        this.skipBlocks(decoder, function() {
            self.skipData(writersSchema.items, decoder);
        })
    },

    readMap: function(writersSchema, readersSchema, decoder) {
        var self = this;
        var map = {};
        var block = this.readBlocks(decoder, function() {
            if (map instanceof BlockDelayReadError) return;
            var key = decoder.readString();
            var value = self.readData(writersSchema.values, readersSchema.values, decoder);
            if (key instanceof BlockDelayReadError)
                map = key;
            else if (value instanceof BlockDelayReadError) {
                map = value;
            } else
                map[key] = value;
        });
        if (block instanceof BlockDelayReadError)
            return block;
        else
            return map;
    },

    skipMap: function(writersSchema, decoder) {
        var self = this;
        this.skipBlocks(decoder, function() {
            decoder.skipString();
            self.skipData(writersSchema.values, decoder);
        })
    },

    readUnion: function(writersSchema, readersSchema, decoder) {
        var oldOffset = decoder._input.offset;
        var schemaIndex = decoder.readLong();
        if (schemaIndex instanceof BlockDelayReadError) return schemaIndex;
        if (schemaIndex < 0 || schemaIndex >= writersSchema.schemas.length) {
            throw new IOError(`Union ${writersSchema} is out of bounds for ${schemaIndex}, ${decoder._input.offset}, ${decoder._input.length}`);
        }
        var selectedWritersSchema = writersSchema.schemas[schemaIndex];
        var union = {};
        var data = this.readData(selectedWritersSchema, readersSchema.schemas[schemaIndex], decoder);
        if (data instanceof BlockDelayReadError) {
            decoder._input.skip(oldOffset - decoder._input.offset);
            return data;
        }
        union = data;

        return union;
    },

    skipUnion: function(writersSchema, decoder) {
        var index = decoder.readLong();
        if (index === null)
            return null
        else
            return this.skipData(writersSchema.schemas[index], decoder)
    },

    readRecord: function(writersSchema, readersSchema, decoder) {
        var self = this;
        var record = {};
        var oldOffset = decoder._input.offset;
        for (var fieldIdx in writersSchema.fields) {
            var field = writersSchema.fields[fieldIdx];
            var readersField = readersSchema.fieldsHash[field.name];
            if (readersField) {
                var data = self.readData(field.type, readersField.type, decoder);
                if (data instanceof BlockDelayReadError) {
                    decoder._input.skip(oldOffset - decoder._input.offset);
                    return data;
                } else
                    record[field.name] = data;
            } else {
                console.error('SKIPPING');
                self.skipData(field.type, decoder);
            }
        };
        return record;
    },

    skipRecord: function(writersSchema, decoder) {
        var self = this;
        writersSchema.fields.forEach(function(field) {
            self.skipData(field.type, decoder);
        });
    },

    _iterateBlocks: function(decoder, iteration, lambda) {
        var oldOffset = decoder._input.offset;
        var count = decoder.readLong();
        if (count instanceof BlockDelayReadError) return count;
        while(count) {
            if (count < 0) {
                count = -count;
                var output = iteration();
                if (output instanceof BlockDelayReadError) {
                    decoder._input.skip(oldOffset - decoder._input.offset);
                    return output;
                }
            }
            while(count--) lambda();
            count = decoder.readLong();
            if (count instanceof BlockDelayReadError) {
                decoder._input.skip(oldOffset - decoder._input.offset);
                return count;
            }
        }
    },

    readBlocks: function(decoder, lambda) {
        return this._iterateBlocks(decoder, function() { return decoder.readLong(); }, lambda);
    },

    skipBlocks: function(decoder, lambda) {
        return this._iterateBlocks(decoder, function() { decoder.skipFixed(decoder.readLong()) }, lambda);
    }
}

var DatumWriter = function(writersSchema) {

    if ((this instanceof arguments.callee) === false)
        return new arguments.callee(writersSchema);

    if (writersSchema && !(writersSchema instanceof Schema))
        throw new IOError("writersSchema should be an instance of Schema");

    this.writersSchema = writersSchema;
};

DatumWriter.prototype = {

    write: function(datum, encoder) {
        this.writeData(this.writersSchema, datum, encoder);
    },

    writeData: function(writersSchema, datum, encoder) {
        if (!(writersSchema instanceof Schema))
            throw new IOError(`writersSchema is not a valid schema object, it is ${writersSchema}`);

        writersSchema.validateAndThrow(writersSchema.type, datum);

        switch(writersSchema.type) {
            case "null":    encoder.writeNull(datum); break;
            case "boolean": encoder.writeBoolean(datum); break;
            case "string":  encoder.writeString(datum); break;
            case "int":     encoder.writeInt(datum); break;
            case "long":    encoder.writeLong(datum); break;
            case "float":   encoder.writeFloat(datum); break;
            case "double":  encoder.writeDouble(datum); break;
            case "bytes":   encoder.writeBytes(datum); break;
            case "fixed":   this.writeFixed(writersSchema, datum, encoder); break;
            case "enum":    this.writeEnum(writersSchema, datum, encoder); break;
            case "array":   this.writeArray(writersSchema, datum, encoder); break;
            case "map":     this.writeMap(writersSchema, datum, encoder); break;
            case "union":   this.writeUnion(writersSchema, datum, encoder); break;
            case "record":
            case "errors":
            case "request": this.writeRecord(writersSchema, datum, encoder); break;
            default:
                throw new IOError(`Unknown type: ${writersSchema} for data ${datum}`);
        }
    },

    writeFixed: function(writersSchema, datum, encoder) {
        var len = datum.length;
        for (var i = 0; i < len; i++) {
            encoder.writeByte(datum.charCodeAt(i));
        }
    },

    writeEnum: function(writersSchema, datum, encoder) {
        var datumIndex = writersSchema.symbols.indexOf(datum);
        encoder.writeInt(datumIndex);
    },

    writeArray: function(writersSchema, datum, encoder) {
        var self = this;
        if (datum.length > 0) {
            encoder.writeLong(datum.length);
            datum.forEach(function(item) {
                self.writeData(writersSchema.items, item, encoder);
            });
        }
        encoder.writeLong(0);
    },

    writeMap: function(writersSchema, datum, encoder) {
        var self = this;
        var datumSize = Object.keys(datum).length;
        if (datumSize > 0) {
            encoder.writeLong(datumSize);
            for (var key in datum) {
                encoder.writeString(key);
                self.writeData(writersSchema.values, datum[key], encoder);
            }
        }
        encoder.writeLong(0);
    },

    writeUnion: function(writersSchema, datum, encoder) {
        var schemaIndex = -1;

        for (var i = 0; i < writersSchema.schemas.length; i++) {
            if (writersSchema.schemas[i].type === 'record' && writersSchema.schemas[i].validate(writersSchema.schemas[i].type, datum)) {
                schemaIndex = i;
                break;
            } else if (writersSchema.schemas[i].type === 'enum' && writersSchema.schemas[i].validate(writersSchema.schemas[i].type, datum)) {
                schemaIndex = i;
                break;
            } else if (writersSchema.schemas[i].type === 'array' && writersSchema.schemas[i].validate(writersSchema.schemas[i].type, datum)) {
                schemaIndex = i;
                break;
            } else if (writersSchema.isPrimitive(writersSchema.schemas[i].type) && writersSchema.validate(writersSchema.schemas[i].type, datum)) {
                schemaIndex = i;
                break;
            }
        }

        if (schemaIndex < 0) {
            throw new IOError(`No schema found for data ${JSON.stringify(datum)}`);
        } else {
            encoder.writeLong(schemaIndex);
            this.writeData(writersSchema.schemas[schemaIndex], datum, encoder);
        }
    },

    writeRecord: function(writersSchema, datum, encoder) {
        var self = this;
        writersSchema.fields.forEach(function(field) {
            try {
                self.writeData(field.type, datum[field.name], encoder);
            } catch (err) {
                if (err.fieldPath) {
                    err.fieldPath.unshift(field.name);
                }
                throw err;
            }
        });
    }
}
