#!/usr/bin/env node
var utils = require("../server/utils") 
var fs = require("fs")
var mongojs     = require("mongojs")
var db          = mongojs("mongodb://localhost/bydesign",["authors", "posts"])


upgradeDB = () => {
	let promises = []
	db.posts.find({}, function(e, data) {
		if (e) return console.error("Could not upgrade", e)
		for (var datum of data) {
			if (!datum.slug) {
				datum.slug = utils.slugify(datum.title.text)
			}
			(function(datum) {
				promises.push(new Promise(function(resolve, reject) {
					if (datum.guid) return resolve()
					utils.generateId(db.posts).then(function(id) {
						datum.guid = id
						datum.title.url = `/posts/${id}`
						db.posts.save(datum, function(e, d) {
							console.log("Updating: ", datum.slug)
							resolve(d)	
						})
					})
				}))
			})(datum)
		}
		Promise.all(promises).then(function() {
			upgradeFiles()
		}).catch(console.error)
	})
}

upgradeFiles = () => {
	let promises = []
	fs.readdir(__dirname+"/../posts", (e, data) => {
		if (e) return console.error("Could not upgrade", e)
		for (let datum of data) {
			let match = datum.match(/(.*)\.md/)
			if (!match) {
				console.log(`Skipping ${datum}`)
				continue
			}
			promises.push(new Promise((resolve, reject) => {
				db.posts.find({"timestamp": parseInt(match[1])}, (e, data) => {
					if (e || data.length != 1) {
						console.log(`Unable to upgrade ${match[1]}`)
						resolve()
						return
					}
					fs.rename(`${__dirname}/../posts/${datum}`,
						  `${__dirname}/../posts/${data[0].guid}.md`, () => {
						console.log(`Renamed ${datum}`)
						resolve()
					})
				})
			}))
		}
		Promise.all(promises).then(() => migratePosts()).catch(console.error)
	})
}

migratePosts = () => {
	let promises = []
	fs.readdir(__dirname+"/../posts", (e, data) => {
		if (e) return resolve(console.error("Could not migrate", e))
		for (let datum of data) {
			let match = datum.match(/(.*)\.md/)
			if (!match) {
				console.log(`Skipping ${datum}`)
				continue
			}
			promises.push(new Promise((resolve, reject) => {
				db.posts.findOne({"guid": match[1]}, (e, post) => {
					if (e || !post) return resolve( console.log("Could not retrieve: ", e || "No match"))
					fs.readFile(__dirname+"/../posts/"+datum, (e, buff) => {
						if (e) return resolve(console.log(`Could not read ${match}`, e))
						var doc = {
							data: buff.toString(),
							guid: post.guid,
						}
						db.docs.findAndModify({
							query: {guid: doc.guid}, 
							update: {$set: doc}, 
							upsert: true, 
							new: true
						}, (e, d) => {
							if (e || !d) return resolve(console.log(`Could not insert ${match[1]}`))
							post.doc = mongojs.ObjectId(d._id)
							db.posts.save(post, (e, d) => {
								console.log(`Migrating ${datum}`)	
								resolve()
							})
						})
					})
				})
			}))
		}
		Promise.all(promises).then(() => {
			console.log("Done")
			process.exit(0)
		}).catch((e) => {
			console.error(e)
			process.exit(0)
		})
	})
}

upgradeDB()
