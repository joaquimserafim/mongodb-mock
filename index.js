'use strict'

var snappy    = require('snappy-stream')
var fs        = require('fs')
var ramdisk   = require('node-ramdisk')
var pick      = require('js-object-pick')
var isObject  = require('is-js-object')
var VError    = require('verror')
var respawn   = require('respawn')

//
//
//

module.exports = function (options) {
  return new MongoMock(options)
}

function MongoMock (options) {
  if (!isObject(options)) {
    options = {}
  }

  this._version = options.version || '2.6.10'
  this._path    = __dirname + '/versions/'
  this._file    = this._path + 'mongod-' + process.platform + '-x86_64-' +
    this._version + '.sz'

  this._ramdiskOpts = pick(options, 'ramdisk')
  this._ramdisk     = ramdisk(this._ramdiskOpts.name || 'mongod_ram')
  this._ramdiskSize = this._ramdiskOpts.size || 100

  this._volume = ''

  return this
}

//
//
//

MongoMock.prototype.start = function start (cb) {
  var self = this

  self._uncompress(self._file, self._path + 'mongod', uncompressTask)

  function uncompressTask (err) {
    if (err) {
      cb(err)
    } else {
      self._createRamdisk(cb)
    }
  }
}

//
//
//

MongoMock.prototype.stop = function stop(cb) {
  this._deleteRamdisk(this._volume, cb)
}

//
//
//

MongoMock.prototype._createRamdisk = function _createRamdisk (cb) {
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
//
//

MongoMock.prototype._startMongod = function _startMongod (dbPath, cb) {
  this._mongod = mongod(this._path, dbPath)
  this._mongod.on('start', cb)
  this._mongod.on('warn', onError)
  this._mongod.on('stderr', onError)
  this._mongod.start()

  function onError (err) {
    cb(new VError(err.toString(), 'starting mongod on %s cdw', dbPath))
  }
}

//
//
//

MongoMock.prototype._deleteRamdisk = function _deleteRamdisk (volumePoint, cb) {
  var self = this

  self._mongod.stop(deleteVolume)

  function deleteVolume () {
    self._ramdisk.delete(volumePoint, deleteCb)

    function deleteCb (err) {
      if (err) {
        cb(new VError(err, 'deleting the ramdisk %s', volumePoint))
      } else {
        self._deleteFile(cb)
      }
    }
  }
}

MongoMock.prototype._deleteFile = function _deleteFile (cb) {
  var self = this

  fs.unlink(self._path + 'mongod', unlinkCb)

  function unlinkCb (err) {
    if (err) {
      cb(new VError(err, 'deleting file %s', self._path + 'mongod'))
    } else {
      cb()
    }
  }
}

//
// uncompress the mongod bin file
//

MongoMock.prototype._uncompress = function _uncompress (rFile, wFile, cb) {
  var uncompressStream = snappy.createUncompressStream()
  uncompressStream.on('error', errorCb)

  // create the write stream for the uncompress file
  var uncompressFile = fs.createWriteStream(
    wFile,
    {
      flags: 'w',
      mode : '750'
    }
  )
  uncompressFile.on('error', errorCb)

  // readable stream
  var read = fs.createReadStream(rFile)
  read.on('end', cb)
  read.on('error', errorCb)

  // process streams
  read.pipe(uncompressStream).pipe(uncompressFile)

  function errorCb (err) {
    cb(new VError(
      err,
      'uncompress %s mongodb file into %s',
      rFile,
      wFile
    ))
  }
}

//
//
//

function mongod (binPath, DbPath) {
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
