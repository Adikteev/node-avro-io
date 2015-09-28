var PRIMITIVE_TYPES = ['null', 'boolean', 'int', 'long', 'float', 'double', 'bytes', 'string'];
var COMPLEX_TYPES = ['record', 'enum', 'array', 'map', 'union', 'fixed'];

let schemaRecords = {};

class Schema {

  validate(schema, datum) {
    var self = this;
    try {
        self.validateAndThrow(schema, datum);
    } catch (validateErr) {
        return false;
    }
    return true;
  }

  validateAndThrow(schema, datum) {
    // primitive types
    switch (schema) {
      case 'null':
        if (!isNull(datum))
            throw new DataValidationError(`Data [${datum}] is not null`);
        break;
      case 'boolean':
        if (!isBoolean(datum))
            throw new DataValidationError(`Data [${datum}] is not boolean`);
        break;
      case 'int':
      case 'long':
      case 'float':
      case 'double':
        if (!isNumber(datum) || datum === null)
            throw new DataValidationError(`Data [${datum}] is not a number or not defined`);
        break;
      case 'bytes':
        if (datum === null)
            throw new DataValidationError(`Data [${datum}] not defined`);
        break;
      case 'string':
        if (!isString(datum))
          throw new DataValidationError(`Data [${datum}] is not a string`);
        break;
      case 'enum':
        if (datum === null || this.symbols.indexOf(datum) === -1)
          throw new DataValidationError(`Data [${datum}] not a valid enum value. List of values [${this.symbols}]`);
        break;
      case 'array':
        if (datum === null || !Array.isArray(datum))
          throw new DataValidationError(`Data [${datum}] not a an array`);
        break;
      case 'record':
        if (datum === null)
          return false;
        let sortedFields = this.fields.map(function(field){ return field['name']; });
        let sortedDatumFields = keys(datum);
        if (sortedFields.length !== sortedDatumFields.length) {
          throw new DataValidationError(`Data ${JSON.stringify(datum)} has extra fields not in schema. data fields ${JSON.stringify(sortedDatumFields)}. schema fields ${JSON.stringify(sortedFields)}`);
        }
        sortedFields.forEach(function(field) {
          if (sortedDatumFields.indexOf(field) === -1) {
            throw new DataValidationError(`Data ${JSON.stringify(datum)} has extra fields not in schema. data fields ${JSON.stringify(sortedDatumFields)}. schema fields ${JSON.stringify(sortedFields)}`);
          }
        });

        break;
      default:
          break;
    }
    return true;
  }

  isPrimitive(schema) {
    switch (schema) {
      case 'null':
      case 'boolean':
      case 'int':
      case 'long':
      case 'float':
      case 'double':
      case 'bytes':
      case 'string':
          return true;
    }
    return false;
  }

  toString() {
    return JSON.stringify({type: this.type});
  }

  static parse(schema, namespace) {
    var self = this;
    if (isNull(schema) || isUndefined(schema)) {
      throw new InvalidSchemaError(`schema is null, in parentSchema: ${JSON.stringify(parentSchema)}`);
    }

    if (isString(schema)) {
      return new PrimitiveSchema(schemaRecords, schema);
    }

    if (isObject(schema) && !Array.isArray(schema)) {
      if (schema.type === 'record') {
          if (!has(schema, 'fields')) {
              throw new InvalidSchemaError(`record must specify "fields", got ${JSON.stringify(schema)}`);
          } else if (!has(schema, 'name')) {
              throw new InvalidSchemaError(`record must specify "name", got ${JSON.stringify(schema)}`);
          } else {
              let fields = schema['fields'].map(function(field) {
                return new FieldSchema(field['name'], self.parse(field, namespace));
              });
              var record = new RecordSchema(schema['name'], schema['namespace'], fields);
              // Store the schema records into a map of schema name to
              // record, so we can compare against it later if we find
              // something that isn't a primitive data type, but may
              // be a self-reference
              if (!schemaRecords[schema.name]) {
                  schemaRecords[schema.name] = record;
              }

              return record;
          }
      } else if (schema.type === 'enum') {
          if (has(schema, 'symbols')) {
            return new EnumSchema(schema.symbols);
          } else {
            throw new InvalidSchemaError(`enum must specify "symbols", got ${JSON.stringify(schema)}`);
          }
      } else if (schema.type === 'array') {
          if (has(schema, 'items')) {
            return new ArraySchema(self.parse(schema.items, namespace), namespace);
          } else {
            throw new InvalidSchemaError(`array must specify "items", got ${JSON.stringify(schema)}`);
          }
      } else if (schema.type === 'map') {
          if (has(schema, 'values')) {
            return new MapSchema(self.parse(schema.values, namespace));
          } else {
            throw new InvalidSchemaError(`map must specify "values" schema, got ${JSON.stringify(schema)}`);
          }
      } else if (schema.type === 'fixed') {
          if (has(schema, 'size')) {
            return new FixedSchema(schema.name, schema.size);
          } else {
            throw new InvalidSchemaError(`fixed must specify "size", got ${JSON.stringify(schema)}`);
          }
      } else if (has(schema, 'type')) {
        return self.parse(schema.type, namespace);
      } else {
        throw new InvalidSchemaError(`not yet implemented: ${JSON.stringify(schema)}`);
      }
    } else if (Array.isArray(schema)) {
        if (schema.length == 0) {
          throw new InvalidSchemaError('unions must have at least 1 branch');
        }
        var branchTypes = schema.map(function(type) {
          return self.parse(type, schema, namespace);
        });
        return new UnionSchema(branchTypes, namespace);
    } else {
      throw new InvalidSchemaError(`unexpected Javascript type for schema: ${(typeof schema)}`);
    }
  }
}

class NamedSchema extends Schema {
  constructor(name, namespace) {
    super();
  }
}

class PrimitiveSchema extends Schema {
  constructor(schema, type) {
    super();

    if (!isString(type)) {
      throw new InvalidSchemaError('Primitive type name must be a string');
    }

    if (PRIMITIVE_TYPES.indexOf(type) === -1) {
      var record = schemaRecords[type];
      if (record) {
        this.type = record;
        return;
      }
      throw new InvalidSchemaError(`Primitive type must be one of: ${JSON.stringify(PRIMITIVE_TYPES)}; or a previously self-referenced type. Got ${type}`);
    }

    this.type = type;
  }
}

class FieldSchema extends Schema {
  constructor(name, type) {
    super();

    if (!isString(name)) {
      throw new InvalidSchemaError('Field name must be string');
    }

    if (!(type instanceof Schema)) {
      throw new InvalidSchemaError('Field type must be a Schema object');
    }

    this.name = name;
    this.type = type;
  }
}


class RecordSchema extends Schema {
  constructor(name, namespace, fields) {
    super();

    if (!isString(name)) {
      throw new InvalidSchemaError('Record name must be string');
    }

    if (!isNull(namespace) && !isUndefined(namespace) && !isString(namespace)) {
      throw new InvalidSchemaError('Record namespace must be string or null');
    }

    if (!Array.isArray(fields)) {
      throw new InvalidSchemaError('Fields must be an array');
    }

    this.type = 'record';
    this.name = name;
    this.namespace = namespace;
    this.fields = fields;
    this.fieldsHash = {};
    var _fieldsHash = this.fieldsHash;
    fields.forEach(function(field){ _fieldsHash[field.name] = field; });
  }
}


class MapSchema extends Schema {
  constructor(type) {
    super()

    this.type = 'map';
    this.values = type;
  }
}

class ArraySchema extends Schema {
  constructor(items) {
    super();

    if (isNull(items) || isUndefined(items)) {
      throw new InvalidSchemaError('Array "items" schema should not be null or undefined');
    }

    this.type = 'array';
    this.items = items;
  }
}


class UnionSchema extends Schema {
  constructor(schemas, namespace) {
    super();

    if (!Array.isArray(schemas) || isEmpty(schemas)) {
      throw new InvalidSchemaError('Union must have at least 1 branch');
    }

    this.type = 'union';
    this.schemas = schemas;
    this.namespace = namespace;
  }
}


class EnumSchema extends Schema {
  constructor(symbols) {
    super();

    if (!Array.isArray(symbols)) {
      throw new InvalidSchemaError(`Enum must have array of symbols, got ${JSON.stringify(symbols)}`);
    }
    symbols.forEach(function(symbol){
      if (!isString(symbol)) {
        throw new InvalidSchemaError(`Enum symbols must be strings, got ${JSON.stringify(symbols)}`);
      }
    });

    this.type = 'enum';
    this.symbols = symbols;
  }
}


class FixedSchema extends Schema {
  constructor(name, size) {
    super();

    this.type = 'fixed';
    this.name = name;
    this.size = size;
  }
}
