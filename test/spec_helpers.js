var writeBytesArrayInBlock = function(block, data) {
    _.each(data, function(byte){ block.writeByte(byte); });
    block._buffer.clear();
}

var blockAsBuffer = function(block) {
  return new Uint8Array(block._buffer.buffer);
}

var assertBufferContent = function(block, data) {
    var values = blockAsBuffer(block);
    for (var i = 0; i < data.length; i++) {
      values[i].should.equal(data[i])
    }
}
