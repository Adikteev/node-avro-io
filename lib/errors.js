class IOError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = 'Avro IO Error';
  }
}

class BlockError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = 'Avro Block Error';
  }
}


class BlockDelayReadError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = 'Avro Block Delay Read Error';
  }
}

class InvalidSchemaError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = 'Avro Invalid Schema Error';
  }
}

class DataValidationError extends Error {
  constructor(message) {
    super();
    this.message = message;
    this.name = 'Avro Data Validation Error';
  }
}
