const test = require('tape');
const fs = require('fs');

test('Test SampleBlob Success', function(t) {
  // We expect 21 tests: 1-Count, 10-Name checks, 10-Id checks
  t.plan(21);

  // Create variables
  var blobStream = require('../src/index');
  var blobs = [];
  const expectedName = ['Ottawa', 'New York', 'Rome', 'Sydney', 'London', 'Dubai', 'Johannesburg', 'Tokyo', 'Beijing', 'Moscow'];
  const expectedId = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const expectedBlobCount = 10;

  // Handle emitted blobs
  function onBlob(blob) {
    blobs.push(blob);
  }

  // Once we complete, run our tests
  function onComplete() {
    // Check total blobs
    t.equal(blobs.length, expectedBlobCount, 'There should be ' + expectedBlobCount + ' blobs; found ' + blobs.length + '.');

    // Loop through all the blobs and check
    for (var index = 0; index < expectedBlobCount; index ++) {
      t.equal(blobs[index].name, expectedName[index], 'Expecting [' + expectedName[index] + ']; found [' + blobs[index].name + '].');
      t.equal(blobs[index].id, expectedId[index], 'Expecting [' + expectedId[index] + ']; found [' + blobs[index].id + '].');
    }
  }

  // We shouldn't see any errors or exceptions.
  function onError(err) {
    t.ifError(err, 'There should not be an error.' + err);
  }

  // Setup and run our blobStream
  var stream = blobStream
                .definition('_testSampleBlob')
                .file('test_SampleBlob.txt')
                .blob(onBlob)
                .complete(onComplete)
                .error(onError)
                .start()
                ;
});