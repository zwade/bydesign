"use strict";

var editor
var confirmedDelete = false

$(function() {
	if($("#editor").length > 0){
		editor = ace.edit("editor")
		editor.setTheme("ace/theme/chrome")
		editor.getSession().setMode("ace/mode/markdown")
		editor.getSession().setUseWrapMode(true)
	}

	$("#submit").click(submit)
	$(".status-bar").click(visible)

	$("#theme-switcher").click(function() {
		localStorage.useDarkTheme = $("html").toggleClass("dark").hasClass("dark")

		if(editor != null){
			if(localStorage.useDarkTheme == "true"){
				editor.setTheme("ace/theme/monokai")
			} else {
				editor.setTheme("ace/theme/chrome")
			}
		}
	})

	if(localStorage.useDarkTheme == "true"){
		$("html").addClass("force-no-animation")
		$("#theme-switcher").trigger("click")
		$("html").removeClass("force-no-animation")
	}
	$(window).keydown(function (e){
		if ((e.metaKey || e.ctrlKey) && e.keyCode == 83) { /*ctrl+s or command+s*/
			submit()
			e.preventDefault();
			return false;
		}
	});
})

var submit = function() {
	var content = editor.getValue()
	var tags = $("#tags").val()
		.trim()
		.split(" ")
		.filter((tag) => !tag.match(/^\s*$/))

	var title = $("#title").val()

	var deleting = false

	if (content.match(/^\s*$/) && title.match(/^\s*$/) && tags.length == 0) {
		if (!confirmedDelete) {
			confirmedDelete = true
			$("#status").text("Warning: this will delete this post from the server. Hit submit again to send.")
			return
		} else {
			deleting = true
		}
	}
	var visible = $("#visible").prop("checked")

	$("#status").text("Uploading...")

	var XHR = new XMLHttpRequest()
	XHR.open("POST", "")
	XHR.setRequestHeader("Content-Type", "application/json")

	XHR.onload = function(){
		setTimeout(function(that){
			return function(){
				switch(that.status){
					case 200:
						$("#status").text("Update succesful.")
						var res = JSON.parse(that.responseText)
						if (res.id) {
							history.pushState({}, "Editor", "/editor/"+res.id)
							$("#submit").text("Update")
						}
						if (deleting) {
							location.href = "/admin"
						}
						break
					default:
						$("#status").text("Error: " + that.responseText)
						break
				}
			}
		}(this), 200)
	}

	XHR.send(JSON.stringify({
		content: content,
		tags: tags,
		title: title,
		visible: visible
	}))
}

var visible = function() {
	var XHR = new XMLHttpRequest()
	XHR.open("POST", "/visible")
	XHR.setRequestHeader("Content-Type", "application/json")
	
	var el = $(this)
	XHR.onload = function() {
		var res = JSON.parse(XHR.response)
		el.removeClass("hidden")
		el.removeClass("visible")
		el.addClass(res.state)
		el.attr("visible", res.visible)
	}
	XHR.send(JSON.stringify({
		page: el.attr("post"),
		state: !JSON.parse(el.attr("visible"))
	}))
}
