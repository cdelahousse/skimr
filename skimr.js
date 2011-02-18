(function() {

	google.load('feeds', '1', {
		"callback": initFeed,
		"nocss": true
	});

	function initFeed() {

		var rss_url = getRSSLink();

		var google_feed = new google.feeds.Feed(rss_url);
		
		//Initialise feed settings
		google_feed.setResultFormat(google.feeds.Feed.JSON_FORMAT);
		google_feed.includeHistoricalEntries();
		google_feed.setNumEntries(50);

		//Once feed is loaded, callback funtion
		google_feed.load(postFeedInit);
	}

	//What to do once feed has been initialised
	function postFeedInit(results) {
		var entries,
			css,
			html;

		console.log(results);

		if (results.status == 404) throw 'Feed 404';
		
		entries = results.feed.entries;

		html = buildHtmlNodes(entries);
		css = buildCss();

		document.body.appendChild(css);
		document.body.appendChild(html);
	}

	//Scans the <link> tags. Searches for type - application/rss+xml and returns
	//the hypertext reference. If none, returns false
	function getRSSLink() {
		var	link_nodes = document.getElementsByTagName('link'),
			rss_link = false; //false until proven found. Initialised as lost

		//console.log('link nodes: ', link_nodes);
		var n = link_nodes.length;
		for (var i = 0; i < n; i++) {

			var current_node = link_nodes[i],
				node_type = current_node.getAttribute('type');

				//console.log(node_type);	

			//Get first RSS or Atom match
			//TODO: Get this to create an array of matches and then 
			//the rest of the script will figure out the best one.
			if (node_type == 'application/rss+xml' || node_type == 'application/atom+xml') {

				rss_link = current_node.getAttribute('href');

				//console.log('RSS Link pre change', rss_link)
				//If it's not a full on URL, we need to convert it to one
				if (!rss_link.match(/^http/)) {
					var absolute_path = (rss_link.match(/^\//)) ? '': window.location.pathname;
					rss_link = window.location.protocol + '//' + window.location.hostname + absolute_path + rss_link;
				}
				//If we've found a link, we don't need to continue looks
				break;
			}
		}
		//console.log(rss_link)
		return rss_link;
		//TODO Add fallback methods like google.feed.feedlookup
	}



	function buildCss() {
		var css;
		//CSS START
		css = '#skimr \{\n\
	position: absolute;\n\
	top:0;\n\
	right:50%;\n\
	background-color: gold;\n\
	\}\n\
\n\
#skimr a \{\n\
	display:block;\n\
	padding: 5px;\n\
	padding: 5px;\n\
\}';

		//CSS END
		var script_tag = document.createElement('style');
		script_tag.setAttribute('type', 'text/css');

		css = document.createTextNode(css);

		script_tag.appendChild(css);
		return script_tag;
	}

	function buildHtmlNodes(entries) {
		var html,
			div,
			entry,
			title_text,
			title;

		div = document.createElement('div');

		div.setAttribute('id', 'skimr')

		//Creates anchor tags, adds hypertext reference
		var n = entries.length;
		for (var i = 0; i < n; i++) {
			entry = entries[i],

			a = document.createElement('a'); 
			a.setAttribute('href', entry.link);
			
			title_text = (i + 1) + '. ' + entry.title;	
			title = document.createTextNode(title_text);
			a.appendChild(title);

			div.appendChild(a);
		}
		return div;
	}

})();

