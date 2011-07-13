(function(window,undefined) {

//RUNTIME SCRIPT - Script body runs here and calls functions that reside lower down
//PART 1

//Skmir object
var skimr = {},

// Google object
		google,

//Created document elements
		google_tag,
		css_tag,
		skimr_div,//container div
		loading_div,
		list_div,
		dashboard_div,

//Private Properties
		entries_per_page = 50,  //Entries per page
		num_max_entries = 250, //Google feed API maxes out at 250
		rss_url,
		current_offset = 0,
		current_results = null;

//Initilisation
skimr.init = function () {

	var body = document.body;

	rss_url = skimr.getRSSLink(); //Find RSS URL
	//TODO: if getRSSLink fails, exit app with warning to the user

	google_tag = skimr.buildGoogleTag();
	document.getElementsByTagName('head')[0].appendChild( google_tag );

	//Add CSS style tag 
	css_tag = skimr.buildCss();
	body.appendChild( css_tag );

	skimr_div = skimr.buildSkimrDiv();
	body.appendChild( skimr_div );

	//Scroll to top
	window.scroll(0,0);

	//Add loading message to body tag
	loading_div = skimr.buildLoadingDiv();
	skimr_div.appendChild( loading_div );

	dashboard_div = skimr.buildDashboard();
	skimr_div.appendChild(dashboard_div);

	//the Google JS API is weird and takes a while to load,
	//so we need to be sure to load it completely before we continue, hence the onload.
	//http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
	if (google_tag.readyState){  //IE
		google_tag.onreadystatechange = function(){
		if (google_tag.readyState == "loaded" || google_tag.readyState == "complete"){
				google_tag.onreadystatechange = null;
				skimr.loadFeedAPI();
			}
		};
	} else {  //Other browsers, the decent and good ones (not IE)
		google_tag.onload = function(){
			skimr.loadFeedAPI();
		}; 
	}
	
}

//PART 2
//Loads the Google Feeds API
skimr.loadFeedAPI = function() {

	//Move google loader object into local scope
	google = window.google;

	google.load('feeds', '1', {
		"callback": skimr.initFeed, //Once the feed api is loaded, it calls initFeed() 
		"nocss": true
		});
}


// (re)initalise the feed
skimr.initFeed = function (num,callback) {

	var google_feed; //Google Feed object

	//Number of entries to request
	//Default to default entries per page if none specified, the number used for first page
	num = num || entries_per_page; 

	//Callback to be called once feed has been received by GoogFeedAPI
	//Default to postFeedInit
	callback = callback || skimr.postFeedInit;

	//TODO: if Google_Feed doesn't load, exit app with warning to the user
	google_feed = new google.feeds.Feed(rss_url);
	
	//Initialise feed settings
	google_feed.setResultFormat(google.feeds.Feed.JSON_FORMAT);
	google_feed.includeHistoricalEntries();
	google_feed.setNumEntries(num);

	//Once feed is loaded, callback funtion. Default: PostFeedInit
	google_feed.load(callback);
}

//What to do once feed has been initialised
//var results is passed for the google feed api (see initFeed)
skimr.postFeedInit = function (results) {
	var entries;
	

	//TODO WE NEED TO IMPLEMENT PROPER ERROR HANDLING
	// If feed doesn't load or doesn't exist, exit app
	if (results.status.code === 400){
		alert('Woops, there\'s a problem. I\'ll fix it soon... '); //TODO Replace wth proper error handling
		skimr.exitApp();
		//throw 'Feed 404';// TODO MUST CATCH
	}
	
	//Once the feed is initialissed, no need for loading msg
	loading_div.parentNode.removeChild(loading_div);

	entries = current_results = results.feed.entries; 

	//Element that houses feed links
	list_div = skimr.buildListDiv();
	//Append to main element
	skimr_div.appendChild(list_div);

	//Preload remaining for pagination
	skimr.initFeed(num_max_entries,function (){
		console.log(this.feed.entries.length);
		//For some reason, when sending this fucntion as a callback,
		//the returned results object is 'this'. The old results object
		//is still return. There are now two result objects within the
		//scope. Weird, huh?
		current_results = this.feed.entries;
		 });
}


skimr.pagination = function(offset) {
	list_div.parentNode.removeChild(list_div);
	//Element that houses feed links
	list_div = skimr.buildListDiv(offset);
	//Append to main element
	skimr_div.appendChild(list_div);
}

//Scans the <link> tags. Searches for type - application/rss+xml and returns
//the hypertext reference. If none, returns false
skimr.getRSSLink = function () {
	var	link_nodes = document.getElementsByTagName('link'),
			location = window.location, //local version of location object
			rss_link = false, //false until proven found. Initialised as not found
			n = link_nodes.length,
			current_node,
			node_type;

	for (var i = 0; i < n; i++) {

		current_node = link_nodes[i];
		node_type = current_node.getAttribute('type');

		//console.log(node_type);	

		//Get first RSS or Atom match
		if (node_type == 'application/rss+xml' || node_type == 'application/atom+xml') {

			rss_link = current_node.getAttribute('href');

			//console.log('RSS Link pre change', rss_link)
			//If it's not a full on URL, we need to convert it to one
			if (!rss_link.match(/^http/)) {
				var absolute_path = (rss_link.match(/^\//)) ? '': location.pathname;
				rss_link = location.protocol + '//' + location.hostname + absolute_path + rss_link;
			}
			//If we've found a link, we don't need to continue looping
			break;
		}
	}

	return rss_link || googleFeedLookup(location);
	
	//return rss_link;
}

skimr.googleFeedLookup = function (url){
	if (!google.feeds.lookupFeed) {
		console.log('Google Feed Lookup not loaded');
		return false;
	}
	return google.feeds.lookupFeed(url,function(results){
		var feed = results.url || false;
		console.log('Google Feed Lookup returned: ',feed)
		return feed;
		});
}

//builds that tag that will load the google api
skimr.buildGoogleTag = function (){ 
	var google_tag;
	google_tag = document.createElement('script');
	google_tag.src = 'https://www.google.com/jsapi';
	google_tag.setAttribute('type','text/javascript');
	return google_tag;
}

//Create loading div element
skimr.buildLoadingDiv =	function (){
	var div = document.createElement('div');

	div.id = 'skimr-loading';
	(div.innerContent) ?
		div.innerContent = 'Loading...' : //W3C  
		div.innerText = 'Loading...'; //IE (ewwww)

	return div;
}

skimr.buildCss = function () {
	var css,
		css_tag;


		css = 
			//RESETS		
		'html \{position: relative;\}\n'//For full page veil

		+ 'html,body \{width: 100% !important; padding: 0 !important; '
			+ 'min-width: 100% !important; margin: 0 !important; '
			+ 'max-width: 100% !important; \}\n'//For full page veil

		+ '#skimr, #skimr * \{padding: 0; margin: 0;\}\n' // reset

		+ '#skimr \{position: absolute;top:0;left:0;min-height:100%; width:100%; '
			+ 'background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE'
			+ 'AAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGC4DAAA2ADUwvUnWwAAAABJRU5E'
			+ 'rkJggg==) transparent repeat; '//cont'd
			+ 'margin: 0; z-index: 99999; font-weight: normal; '//cont'd
			+ 'overflow: hidden; padding-bottom: 30px; '//clearfix and padding
			+ 'font: normal normal 16px/1.2 Helvetica, Arial, Sans-Serif; \}\n'//cont'd

		+ '#skimr-loading \{width: 100%; background-color: #FFF; color: #000;' 
			+ 'text-align: center;border-bottom: 1px solid #999;\}\n'//cont'd

		+ '#skimr-dashboard \{width: 100%; background-color: #fff; color: #ddd;' 
			+ 'position: fixed; bottom: 0; left: 0; text-align: center; \}\n'

		+ '#skimr-dashboard a \{color: #444;\}'

		+ '#skimr-list \{background-color: #efefef; width: 50%; margin: 0 auto; '
			+ 'text-align: left; \}\n' 

		+ '#skimr-list li \{ border-bottom: 1px dashed #aaa;\}'

		+ '#skimr-list a \{display:block; color: #444;  '
			+ ' font-weight: normal;\}\n';//cont'd


	css_tag = document.createElement('style'); 
	//css_tag.type = 'text/css';
	

	try {
		css_tag.appendChild(document.createTextNode(css) ); //W3C
	} catch (e) {
		if (css_tag.styleSheet) { //IE. Ew.
			css_tag.styleSheet.cssText =  css;
		}
	}
	return css_tag;
}

skimr.buildSkimrDiv = function (){
	var div = document.createElement('div');
	div.id = 'skimr';
	return div;
}

skimr.buildListDiv = function (offset) {
	var ul,
			entry,
			title_text,
			title,
			li,
			span,
			pub_date,
			entries;
	
	ul = document.createElement('ul');

	ul.id = 'skimr-list';

	offset = offset || 0; // If offset given, the work with that, if not, default 0
	
	entries = current_results;

	//Creates anchor tags, adds hypertext reference
	var n = entries.length; //XXX Is this variable needed?
	for (var i = offset; i < n; i++) { //TODO Convert loop to decrement to zero
		entry = entries[i];

		li = document.createElement('li'); 

		a = document.createElement('a'); 
		a.setAttribute('href', entry.link);
		
		title_text = entry.title;	
		title = document.createTextNode(title_text);
		a.appendChild(title); 
		
		span = document.createElement('span');
		pub_date = new Date(entry.publishedDate);
		pub_date = pub_date.toLocaleDateString();// TODO Convert this to dd/mm/yyyy
		pub_date = document.createTextNode(pub_date); 
		span.appendChild(pub_date);

		li.appendChild(a);
		li.appendChild(span);

		ul.appendChild(li); 
	}
	return ul;
}

skimr.buildDashboard = function () {
	var dashboard_div,
			exit_anchor,
			next_anchor;
	//TODO Add document = document; //moves document global in to a local variable for performance

	dashboard_div = document.createElement('div'); 
	dashboard_div.id = 'skimr-dashboard';
	
	exit_anchor = document.createElement('a');
	exit_anchor.id = 'skimr-exit';
	exit_anchor.appendChild(document.createTextNode('Exit'));

	//TODO CONVERT THIS TO EVENT DELEGATAION
	exit_anchor.onmouseover = function(){
		exit_anchor.style.cursor = 'pointer'
	};
	exit_anchor.onmouseout = function(){
		exit_anchor.style.cursor='default'
	};
	exit_anchor.onclick = skimr.exitApp;

	next_anchor = document.createElement('a');
	next_anchor.id = 'skimr-next';
	next_anchor.appendChild(document.createTextNode('Next'));

	next_anchor.onmouseover = function(){
		next_anchor.style.cursor = 'pointer'
	};
	next_anchor.onmouseout = function(){
		next_anchor.style.cursor='default'
	};
	next_anchor.onclick = function () {
		current_offset += entries_per_page;
		skimr.pagination(current_offset);
	}

	dashboard_div.appendChild(exit_anchor);
	dashboard_div.appendChild(next_anchor);

	return dashboard_div; 
}

skimr.exitApp = function () {
	skimr_div.parentNode.removeChild( skimr_div ); 
	css_tag.parentNode.removeChild( css_tag );
	google_tag.parentNode.removeChild( google_tag );
	//XXX can we delete the nodes using the delete keyword?
	
	//Delete global object;
	delete skimr;

//todo Delete script tag	
	//var script_tagsdocument.getElementsByTagName('head')[0].findElementsByTagName('script');
	//	for loop
	
	//Delete this object
	//delete this;
}

//Expose skimr to the global namespace
window.skimr = skimr;
skimr.init();
})(window);
