'use strict'

var snappy    = require('snappy-stream')
var fs        = require('fs')
var ramdisk   = require('node-ramdisk')
var isObject  = require('is-js-object')
var VError    = require('verror')
var respawn   = require('respawn')
var debug     = require('debug')('mongodb-mock')
var getProp   = require('get-property-value')
var EE        = require('events').EventEmitter
var inherits  = require('util').inherits

//
//
//

module.exports = function mongoMock (options) {
  debug('options: %j', options)
  return new MongoMock(options)
}

function MongoMock (options) {
  EE.call(this)

  if (!isObject(options)) {
    options = {}
  }

  this._version = options.version || '2.6.10'
  this._path    = this._binPath = __dirname + '/versions/'
  this._file    = __dirname + '/versions/mongod-' +
    process.platform + '-x86_64-' +
    this._version + '.sz'

  this._ramdisk     = ramdisk(getProp(options, 'ramdisk.name') || 'mongod_ram')
  this._ramdiskSize = getProp(options, 'ramdisk.size') || 100

  this._volume = ''

  return this
}

inherits(MongoMock, EE)

//
// public method to start the mongodb mock
//

MongoMock.prototype.start = function start (cb) {
  var self = this

  uncompress(self._file, self._path + 'mongod', uncompressTask)

  function uncompressTask (err) {
    if (err) {
      cb(err)
    } else {
      self._createRamdisk(cb)
    }
  }
}

//
// public method to stop the mock
//

MongoMock.prototype.stop = function stop(cb) {
  var self = this

  self._mongod.stop(clean)

  function clean () {
    debug('run cleaning')
    self._deleteRamdisk(cb)
  }
}

//
// start the child process with mongod
//

MongoMock.prototype._startMongod = function _startMongod (dbPath, cb) {
  debug('spawn `mongod`')
  var self = this

  self._mongod = mongod(self._binPath, dbPath)
  self._mongod.on('start', cb)
  self._mongod.on('warn', onError)
  self._mongod.on('stderr', onError)
  self._mongod.start()

  function onError (err) {
    debug('spawn `mongod`: %s', err)
    self.emit(
      'error',
      new VError(err.toString(), 'starting mongod on %s cdw', self._binPath)
    )
  }
}

//
// create a ramdisk for mongod
//

MongoMock.prototype._createRamdisk = function _createRamdisk (cb) {
  debug('create ramdisk')

  var self = this

  self._ramdisk.create(this._ramdiskSize, createCb)

  function createCb (err, mount) {
    if (err) {
      cb(new VError(err, 'creating the ramdisk'))
    } else {
      self._volume = mount
      self._startMongod(mount, cb)
    }
  }
}

//
// delete the ramdisk was created to run mongod
//

MongoMock.prototype._deleteRamdisk = function _deleteRamdisk (cb) {
  debug('delete ramdisk')

  var self = this

  self._ramdisk.delete(self._volume, deleteCb)

  function deleteCb (err) {
    if (err) {
      cb(new VError(err, 'deleting the ramdisk %s', self._volume))
    } else {
      deleteFile(self._path, cb)
    }
  }
}

//
// Help functions
//

//
// delete mongod file
//

function deleteFile (path, cb) {
  debug('delete `mongod` file')

  fs.unlink(path + 'mongod', unlinkCb)

  function unlinkCb (err) {
    if (err) {
      cb(new VError(err, 'deleting file %s', path + 'mongod'))
    } else {
      cb()
    }
  }
}

//
// uncompress the mongod binary file
//

function uncompress (readFile, writeFile, cb) {
  debug('uncompress file: %s, %s', readFile, writeFile)

  var uncompressStream = snappy.createUncompressStream()
  uncompressStream.on('error', errorCb)

  // create the write stream for the uncompress file
  var uncompressFile = fs.createWriteStream(
    writeFile,
    {
      flags: 'w',
      mode : '750'
    }
  )
  uncompressFile.on('error', errorCb)

  // readable stream
  var read = fs.createReadStream(readFile)
  read.on('end', cb)
  read.on('error', errorCb)

  read.pipe(uncompressStream).pipe(uncompressFile)

  function errorCb (err) {
    debug('uncompress file: %s', err)
    cb(new VError(
      err,
      'uncompress %s mongodb file into %s',
      readFile,
      writeFile
    ))
  }
}

//
// spawn mongod binary
//

function mongod (binPath, DbPath) {
  debug('mongod process: %s, %s', binPath, DbPath)

  return respawn(
    [
      'mongod',
      '--smallfiles',
      '--noprealloc',
      '--nojournal',
      '--port',
      '27018',
      '--dbpath',
      DbPath
    ],
    {kill: 1000, sleep: 50, cwd: binPath}
  )
}
