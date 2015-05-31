'use strict'

var snappy = require('snappy')


function setEnv () {
  var mongoVersion = '2.6.10'

  var os = ['darwin', 'linux']

  this.version = function version (v) {
    mongoVersion = v
    return this
  }

  this.load = function load (cb) {
    if (os.indexOf(process.platform) === -1) {
      throw new Error('Current platform "%s" not supported', process.platform)
    }



  }


  return this
}


