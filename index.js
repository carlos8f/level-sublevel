var EventEmitter = require('events').EventEmitter
var next         = process.nextTick
var SubDb        = require('./sub')
var fixRange     = require('level-fix-range')

var Hooks   = require('level-hooks')

module.exports   = function (db, sep) {
  if (db.sublevel) return db

  //use \xff (255) as the seperator,
  //so that sections of the database will sort after the regular keys
  db._sep = sep = sep || '\xff'

  Hooks(db)

  db.sublevels = {}

  db.sublevel = function (prefix, sep) {
    if(db.sublevels[prefix])
      return db.sublevels[prefix]
    return new SubDb(db, prefix, sep || this._sep)
  }

  db.methods = {}

  db.prefix = function (key) {
    return '' + (key || '')
  }

  db.pre = function (range, hook) {
    if(!hook)
      hook = range, range = {
        max  : sep
      }
    return db.hooks.pre(range, hook)
  }

  db.post = function (range, hook) {
    if(!hook)
      hook = range, range = {
        max : sep
      }
    return db.hooks.post(range, hook)
  }

  function safeRange(fun) {
    return function (opts) {
      opts = opts || {}
      fixRange(opts)

      if(opts.reverse) opts.start = opts.start || sep
      else             opts.end   = opts.end || sep

      return fun.call(db, opts)
    }
  }

  db.readStream =
  db.createReadStream  = safeRange(db.createReadStream)
  db.keyStream =
  db.createKeyStream   = safeRange(db.createKeyStream)
  db.valuesStream =
  db.createValueStream = safeRange(db.createValueStream)
  
  var batch = db.batch
  db.batch = function (changes, opts, cb) {
    changes.forEach(function (e) {
      if(e.prefix) {
        if('function' === typeof e.prefix.prefix)
          e.key = e.prefix.prefix(e.key)
        else if('string'  === typeof e.prefix)
          e.key = e.prefix + e.key
      }
    })
    batch.call(db, changes, opts, cb)
  }
  return db
}

