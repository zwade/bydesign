var handlebars = require("handlebars")
module.exports = {
	admins: [
		"zacharywade@gmail.com",
		"matthew.damon.savage@gmail.com",
		"dhlanm@gmail.com",
		"ellisstsung@gmail.com",
		"bzhang.2003@gmail.com",
		"lee123456771@gmail.com",
		"kyle.w.herndon@gmail.com",
		"dh4dt@virginia.edu",
	],
	rssInfo: {
		title: "By Design",
		description: "An open source blogging platform that's easy to use and easily extensible",
		site_url: "http://jsby.design",
		feed_url: "http://jsby.design/rss",
		language: "en",
	},
	paths: {
		posts: "posts",
		client: "client",
		render: "render"
	},
	adminInfo: require("./users.js"),	
	sidebar: [{
		title: (new handlebars.SafeString("<a href='/about'>About</a>")),
		content: "JS By Design is a blogging platform for any use case"
	}],
}
