const fs = require('fs');
const events = require('events');
const util = require('util');
const stream = require('stream');

/**
 * BlobStream Class
 *
 * Consume files that generally repeat a pattern and emit defined JSON objects parsed from the file.
 */
module.exports = (function () {

  var blobDefinition;
  var readStream;
  var streamData = '';
  var ee = new events.EventEmitter();
  var currentBlob;

  /**
   * When a line of data is found in our data block, we want to massage that data and add it to our existing
   * blob if it is relevant. Otherwise, we'll just discard the data.
   *
   */
  function handleLineData(lineData) {
    // If the line data matches our blobEnd definition, the current blob is complete.
    // As such, we'll emit the current blob, and clean up our temp blob storage.
    if (lineData === blobDefinition.settings.blobEnd) {
      ee.emit('blob', currentBlob);
      currentBlob = null;
      return;
    }

    // Find the first equals to seperate KVPs. Don't use split, since some values contain our delimiter
    var equalsIndex = lineData.indexOf(blobDefinition.settings.kvpDelimiter);

    // If there is no delimiter, we'll ignore the data.
    if (equalsIndex > -1) {
      // If the currentBlob doesn't exist, create one to store our data in
      if (!currentBlob) {
        currentBlob = {};
      }

      // Grab the KVP and store it in the current blob. If required, convert the value.
      var key = lineData.substring(0, equalsIndex);
      var value = lineData.substr(equalsIndex + 1);
      currentBlob[key] = convertValue(key, value);
    }
  }

  /**
   * Converts the value to it's proper type for a given key. If no type is defined, then the value
   * will stay as a String.
   *
   * @param {String} Key to check in the definition document, under the structure[key].type property.
   * @param {String} Value to convert.
   * @returns {int|float|bool|Date|String} The Converted value, as defined within the definition document.
   */
  function convertValue(key, value) {
    switch (blobDefinition.structure[key].type) {
        case 'int':       return parseInt(value, 10);
        case 'float':     return parseFloat(value);
        case 'boolean':
        case 'bool':      return (value.toLowerCase() === 'true');
        case 'date':      return new Date(value);
        default:          return value;
      }
  }

  /**
   * Handles when event data comes from the readStream
   *
   * @param {String | Buffer} Data from the readStream
   */
  function readStreamHandleData (data) {
    // Append the new data to existing, unhandled data.
    streamData += data;

    // Find the first newline
    var newlineIndex = streamData.indexOf('\n');

    // If a newline exists, we'll parse the data, otherwise keep going
    // Loop through continously as the new chunck might contain several
    // blocks of data.
    while (newlineIndex > -1) {
      // Upon finding a newline, grab the data out of the stream
      var lineData = streamData.substring(0, newlineIndex);
      streamData = streamData.substring(newlineIndex + 1);

      // Consume the data
      handleLineData(lineData);

      // Find the next block of data
      newlineIndex = streamData.indexOf('\n');
    }
  }

  /**
   * Handles when no more data will be read from the stream.
   */
  function readStreamHandleEnd () {
    ee.emit('end');
  }

  /**
   * Handler for handling errors generated by the readStream.
   *
   * @param {Object} Error generated by the readStream.
   */
  function readStreamHandleError (err) {
    ee.emit('error', err);
  }

  /**
   * Handler for when the readStream closes.
   */
  function readStreamHandleClose () {
    ee.emit('complete');
  }

  /**
   * Generic event binder.
   *
   * @param {String} Event name to bind.
   * @param {Function} Event handler.
   * @returns {Object} the blobStream object.
   */
  function on(event, callback) {
    ee.on(event, callback);
    return this;
  }

  /**
   * Sets the blob event handler.
   *
   * @param {Function} The function to run when a blob is emitted.
   * @returns {Object} the blobStream object.
   */
  function blob(callback) {
    ee.on('blob', callback);
    return this;
  }

  /**
   * Sets the complete event handler.
   *
   * @param {Function} The function to run on an error.
   * @returns {Object} The blobStream object.
   */
  function complete(callback) {
    ee.on('complete', callback);
    return this;
  }

  /**
   * Sets the error event handler.
   *
   * @param {Function} The function to run on an error.
   * @returns {Object} the blobStream object.
   */
  function error(callback) {
    ee.on('error', callback);
    return this;
  }

  /**
   * Sets the blob definition file. These definitions are currently set in /blobs/.
   *
   * @returns {Object} the blobStream object
   */
  function setDefinition (definition) {
    blobDefinition = require('./blobs/' + definition + '.js');
    return this;
  }

  /**
   * Sets the file to be read by the blobStream.
   *
   * @param {String} The file (with path) to create a readStream from.
   * @returns {Object} the blobStream object
   */
  function setFile (file) {
    readStream = new fs.createReadStream(file);
    return this;
  }

  /**
   * Checks if the blobStream is ready to start.
   *
   * @returns {bool} True if it is ready, false otherwise.
   */
  function isReady() {
    return blobDefinition !== null && readStream !== null;
  }

  /**
   * Starts the blobStream if isReady() returns true. Starts the stream by binding
   * all the events to their respective handlers.
   *
   * @returns {Object} the blobStream object
   */
  function start() {
    if (!isReady()) { return; }

    readStream.on('end', readStreamHandleEnd);
    readStream.on('error', readStreamHandleError);
    readStream.on('close', readStreamHandleClose);
    readStream.on('data', readStreamHandleData);

    return this;
  }

  return {
    definition: setDefinition,
    file: setFile,
    isReady: isReady,
    start: start,
    on: on,
    blob: blob,
    complete: complete,
    error: error,
  };
})();