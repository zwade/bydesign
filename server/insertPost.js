#!/usr/bin/env node

"use strict";

var fs       = require("fs")
var path     = require("path")
var config   = require("../config")
var shortid  = require("shortid")
var utils    = require("./utils")
var logger   = require("./logger")
var mongojs  = require("mongojs")

var prompt
var globals  = {}
globals.db = undefined
globals.path = undefined

var getData = function() {
	return fetchData().then(parseData)
}

var fetchData = function() {
	return denodeify(prompt.get, [['author', 'title', 'tags', 'content']])
}

var parseData = function(data) {
	return new Promise(function(resolve, reject) {
		var time = Date.now()
		var out = {
			db: {
				title: {
					text: data.title,
					url: "/posts/"+time,
				},
				author: data.author,
				tags: data.tags.split(" "),
				timestamp: time,
				visible: true,
			},
			content: {
				address: data.content	
			}
		}
		resolve(out)
	})
}

var getFile = function(data) {
	return denodeify(fs.readFile, [path.join(process.cwd(),data.content.address)], function(content) {
		data.content.value = content.toString()
		return data
	})
}

var saveFile = function(data) {
	console.log(data.db.guid)
	return denodeify(globals.db.docs.findAndModify, [{
		query: {guid: data.db.guid},
	        update: {$set: data.content},
	        upsert: true,
	        new: true
	}], function(e) {
		data.doc = mongojs.ObjectId(e._id)
		return data
	}, globals.db.docs)
}

var saveDatabase = function(data) {
	data.db.tags = tagCheck(data.db.tags)	
	return denodeify(globals.db.posts.insert, [data.db], undefined, globals.db.posts)
}

var updateDatabase = function(data) {
	data.db.tags = tagCheck(data.db.tags)	
	return denodeify(globals.db.posts.update, [{guid: data.db.guid}, {$set: data.db}], undefined , globals.posts.update)
}

var insertPost = function(data, db, path, update) {
	globals.path = path
	globals.db = db
	return saveFile(data).then(function(val) {
		if (!update) {
			return saveDatabase(val)
		} else {
			return updateDatabase(val)
		}
	}, crash)
}

var denodeify = function(fn, args, alt, th) {
	return new Promise(function(resolve, reject) {
		args[args.length] = (function(err, data) {
			if (err) {
				reject(err || "No Data")
			} else {
				resolve(alt ? alt(data) : data)
			}
		})
		try {
			fn.apply(th,args)
		} catch (e) {
			reject(e)
		}
	})
}

module.exports = function(db, path) {
	return (function(db, path) {
		return function(data, update) {
			return insertPost(data, db, path, update).catch(crash)
		}
	})(db, path)
}

var crash = function(a) {
	logger.error(a)
}

var tagCheck = function(tags) {
	for (var t = 0; t < tags.length; t++) {
		if (!tags[t].match(/^[a-z0-9\-]{1,16}$/)) {
			tags.splice(t, 1)
			t--
		}
	}
	return tags
}

if (!module.parent) {
	prompt = require("prompt")
	prompt.start()
	prompt.colors = false
	var mongojs = require("mongojs")
	var db      = mongojs("mongodb://localhost/bydesign",["posts"])	
	fetchData().then(parseData, crash).then(getFile, crash).then(module.exports(db, path.join(__dirname, "..", "client")), crash).then(function() {
		console.log("Finished")
		return Promise.resolve("done")
	}).catch(crash)
}

