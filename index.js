'use strict'

var snappy  = require('snappy-stream')
var fs      = require('fs')
var format = require('util').format


// https://github.com/joaquimserafim/mongodb-mock/raw/master/versions/
// mongod-%s-x86_64-%s.sz


function mongoMock () {
  if (!(this instanceof mongoMock)) {
    return new mongoMock()
  }

  var mongoVersion  = '2.6.10'
  var supportedOS   = ['darwin', 'linux']
  var path          = __dirname + '/versions/'
  var file          = path + 'mongod-%s-x86_64-%s.sz'

  this.version = function version (v) {
    mongoVersion = v || mongoVersion
    return this
  }

  this.load = function load (cb) {
    var os

    if (supportedOS.indexOf(process.platform) === -1) {
      throw new Error('Current platform "%s" not supported', process.platform)
    } else {
      os = supportedOS.filter(function(e) {
        return process.platform === e
      })
    }

    uncompress(os, format(file, os, mongoVersion), path + 'mongod', done)

    function done () {
      console.log('heyeyeyey')
      cb()
    }

  }

  return this
}

//
// uncompress the mongod bin
//

function uncompress (os, readFile, writeFile, cb) {
  // use snappy-stream to uncompress
  var uncompressStream = snappy.createUncompressStream()
  uncompressStream.on('error', errorCb)

  // create the write stream for the uncompress file
  var uncompressFileOpts  = {flags: 'w',  mode: '750'}
  var uncompressFile      = fs.createWriteStream(writeFile, uncompressFileOpts)
  uncompressFile.on('error', errorCb)

  // readable stream
  var read = fs.createReadStream(readFile)
  read.on('end', cb)
  read.on('error', errorCb)

  // process streams
  read.pipe(uncompressStream).pipe(uncompressFile)

  function errorCb (err) {
    throw new Error(err)
  }
}

// ./mongod --smallfiles --noprealloc --nojournal --port 27018 --dbpath /Volumes/ramdisk
// osx - diskutil erasevolume HFS+ ramdisk `hdiutil attach -nomount ram://204800`


mongoMock().version().load(function() {
  console.log('end')
})


