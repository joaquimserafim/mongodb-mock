'use strict'

var Lab     = require('lab')
var Code    = require('code')
var fs      = require('fs')

var lab = module.exports.lab = Lab.script()

var describe  = lab.describe
var it        = lab.it
var expect    = Code.expect

var mongoMock = require('./')

describe('mock mongodb', function() {

  it('should succeed creating a mock using the default options',
  function(done) {
    var mock = mongoMock()

    mock.start(function(err) {
      expect(err).to.be.undefined()
      mock.stop(function(err) {
        expect(err).to.be.undefined()
        done()
      })
    })
  })

  it('should succeed creating a mock passing some options', function(done) {
    var mock = mongoMock({version: '2.6.10', ramdisk: {name: 'test', size: 50}})

    mock.start(function(err) {
      expect(err).to.be.undefined()
      mock.stop(function(err) {
        expect(err).to.be.undefined()
        done()
      })
    })
  })

  it('should fail creating the mock due a wrong/non-existent mongodb version',
  function(done) {
    var mock = mongoMock({version: '2.6.11', ramdisk: {name: 'test', size: 50}})

    mock.start(function(err) {
      expect(err).to.exist()
      done()
    })
  })

  it('should fail creating the ramdisk', function(done) {
    var mock = mongoMock()

    mock.start(function(err) {
      expect(err).to.be.undefined()
      mock.start(function(err) {
        expect(err).to.exist()
        expect(err.message)
          .to.be.equal('creating the ramdisk: device "/tmp/mongod_ram"' +
            ' already mounted')
        mock.stop(function(err) {
          expect(err).to.be.undefined()
          done()
        })
      })
    })
  })

  it('should fail deleting the ramdisk', function(done) {
    var mock = mongoMock()

    mock.start(function(err) {
      expect(err).to.be.undefined()
      mock.stop(function(err) {
        expect(err).to.be.undefined()
        mock.stop(function(err) {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  it('should fail deleting `mongod` binary file', function(done) {
    var mock = mongoMock()

    mock.start(function(err) {
      expect(err).to.be.undefined()
      fs.unlink('versions/mongod', function(err) {
        expect(err).to.be.null()
        mock.stop(function(err) {
          expect(err).to.exist()
          done()
        })
      })
    })
  })

  it('should fail run the `mongod` process', function(done) {
    var mock = mongoMock()

    // override _binPath
    mock._binPath = 'asas/tmp'

    mock.on('error', function(err) {
      expect(err).to.exist()
      mock._deleteRamdisk(function(err) {
        expect(err).to.be.undefined()
        done()
      })
    })

    mock.start(function(err) {
      expect(err).to.be.undefined()
    })
  })

})
