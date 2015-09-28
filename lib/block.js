class Block {
  constructor(size) {
    this._buffer = new ByteBuffer(size || 1);
    this._buffer.LE(true);
    //FIXME: only do that in development/test ?
    this._buffer.assert(true);
  }

  ensureCapacity(toAdd) {
    let remaining = this._buffer.limit - this._buffer.offset;
    if (remaining > toAdd) { return; }

    let neededCapacity = this._buffer.limit + (toAdd - remaining);
    this._buffer.ensureCapacity(neededCapacity);
  }

  writeByte(val) {
    this.ensureCapacity(1);
    this._buffer.writeInt8(val);
  }

  writeVarint64ZigZag(val) {
    this.ensureCapacity(8);
    this._buffer.writeVarint64ZigZag(val);
  }

  writeFloat32(val) {
    this.ensureCapacity(4);
    this._buffer.writeFloat32(val);
  }

  writeDouble(val) {
    this.ensureCapacity(8);
    this._buffer.writeDouble(val);
  }

  writeUTF8String(val) {
    this.ensureCapacity(ByteBuffer.calculateUTF8Bytes(val));
    this._buffer.writeUTF8String(val);
  }

  readByte() {
    return this._buffer.readByte();
  }

  readLong() {
    return this._buffer.readLong();
  }

  readVarint64ZigZag() {
    return this._buffer.readVarint64ZigZag();
  }

  readFloat32() {
    return this._buffer.readFloat32();
  }

  readDouble() {
    return this._buffer.readDouble();
  }

  readUTF8String(length) {
    return this._buffer.readUTF8String(length, ByteBuffer.METRICS_BYTES);
  }

  skip(len) {
    return this._buffer.skip(len);
  }

  readUint8() {
    return this._buffer.readUint8()
  }

  // test only, to remove
  offset() {
    return this._buffer.offset;
  }

  toBuffer() {
    return new Uint8Array(this._buffer.buffer);
  }

}

