(function() {
	//RUNTIME SCRIPT - Script body runs here and calls functions that reside lower down
	//PART 1
	
	//Created document elemtent
	var google_tag,
		css_tag,
		skimr_div,//container div
		loading_div,
		list_div,
		dashboard_div;

	google_tag = ( buildGoogleTag() );
	document.getElementsByTagName('head')[0].appendChild( google_tag );

	//Add CSS style tag 
	css_tag = buildCss();
	document.body.appendChild( css_tag );

	skimr_div = buildSkimrDiv();
	document.body.appendChild( skimr_div );

	scroll(0,0);

	//Add loading message to body tag
	loading_div = buildLoadingDiv();
	skimr_div.appendChild( loading_div );

	dashboard_div = buildDashboard();
	skimr_div.appendChild(dashboard_div);

	//the Google JS API is weird and takes a while to load,
	//so we need to be sure to load it completely before we continue, hence the onload.
	//http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
	if (google_tag.readyState){  //IE
		google_tag.onreadystatechange = function(){
		if (google_tag.readyState == "loaded" || google_tag.readyState == "complete"){
				google_tag.onreadystatechange = null;
				loadFeedAPI();
			}
		};
	} else {  //Others
		google_tag.onload = function(){
			loadFeedAPI();
		}; 
	}
	

	//END OF PART 1 -- Runtime code



	//PART 2
	//Loads the Google Feeds API
	function loadFeedAPI(){

		google.load('feeds', '1', {
			"callback": initFeed, //Once the feed api is loaded, it calls initFeed() 
			"nocss": true
			});
	}
	
	//PART 3
	//Once google feed api is loaded, initalise the feed
	function initFeed() {

		var rss_url = getRSSLink();

		console.log(rss_url); //xxx 

		//If getRSSLink function can't find a link, use Feed API's feed lookup
		if (!rss_url) {
			rss_url = googleFeedLookup(window.location);
			console.log('google feed lookup');
		console.log(rss_url); //xxx 
		}
		var google_feed = new google.feeds.Feed(rss_url);
		
		//Initialise feed settings
		google_feed.setResultFormat(google.feeds.Feed.JSON_FORMAT);
		google_feed.includeHistoricalEntries();
		google_feed.setNumEntries(50);

		//Once feed is loaded, callback funtion PostFeedInit
		google_feed.load(postFeedInit);
	}

	//PART 4
	//What to do once feed has been initialised
	//var results is passed for the google feed api (see initFeed)
	function postFeedInit(results) {
		var entries;
		

		//TODO WE NEED TO IMPLEMENT PROPER ERROR HANDLING
		// If feed doesn't load or doesn't exist, exit app
		if (results.status.code === 400){
			alert('Woops, there\'s a problem. I\'ll fix it soon... '); //TODO Replace wth proper error handling
			exitApp();
			//throw 'Feed 404';// TODO MUST CATCH
		}
		
		//Once the feed is initialissed, no need for loading msg
		loading_div.parentNode.removeChild(loading_div);
		

		entries = results.feed.entries; 

		//Element that houses feed links
		list_div = buildListDiv(entries);
		//Append to main element
		skimr_div.appendChild(list_div);
	}

	//Scans the <link> tags. Searches for type - application/rss+xml and returns
	//the hypertext reference. If none, returns false
	function getRSSLink() {
		var	link_nodes = document.getElementsByTagName('link'),
			rss_link = false, //false until proven found. Initialised as lost
			n = link_nodes.length;

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
	
	function googleFeedLookup (url){
			//FIX THIS  TODO
		
	}

	//builds that tag that will load the google api
	function buildGoogleTag(){ 
		var google_tag;
		google_tag = document.createElement('script');
		google_tag.src = 'https://www.google.com/jsapi';
		google_tag.setAttribute('type','text/javascript');
		return google_tag;
	}

	//Create loading div element
	 function buildLoadingDiv(){
		var div = document.createElement('div'),
			style_attributes;

		div.setAttribute('id','skimr-loading');
		div.innerHTML = 'Loading...';

		return div;
	}

	function buildCss() {
		var css,
			css_tag;


			css = 
				//RESETS		
			'html \{position: relative;\}\n'//For full page veil

			+ 'html,body \{width: 100% !important; padding: 0 !important; '
				+ 'min-width: 100% !important; margin: 0 !important; '
				+ 'max-width: 100% !important; \}\n'//For full page veil

			+ '#skimr, #skimr * \{padding: 0, margin: 0;\}\n'

			+ '#skimr \{position: absolute;top:0;left:0;height: 100%; width:100%; '
				+ 'background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE'
				+ 'AAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGC4DAAA2ADUwvUnWwAAAABJRU5E'
				+ 'rkJggg==) transparent repeat; '//cont'd
				+ 'margin: 0; z-index: 99999; font-weight: normal;'//cont'd
				+ ' font: normal normal 16px/1.2 Helvetica, Arial, Sans-Serif; \}\n'//cont'd

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
		css_tag.setAttribute('type', 'text/css'); 

		css = document.createTextNode(css); 
		css_tag.appendChild(css);

		return css_tag;
	}

 	function buildSkimrDiv(){
		var div = document.createElement('div'),
			style_attributes;

		div.setAttribute('id','skimr');

		return div;

	}
	function buildListDiv(entries) {
		var ol,
			entry,
			title_text,
			title,
			li,
			span,
			pub_date;

		ol = document.createElement('ol');

		ol.setAttribute('id', 'skimr-list');



		//Creates anchor tags, adds hypertext reference
		var n = entries.length;
		for (var i = 0; i < n; i++) {
			entry = entries[i];

			li = document.createElement('li'); 

			a = document.createElement('a'); 
			a.setAttribute('href', entry.link);
			
			title_text = entry.title;	
			title = document.createTextNode(title_text);
			a.appendChild(title); 
			
			span = document.createElement('span');
			pub_date = new Date(entry.publishedDate);
			pub_date = pub_date.toLocaleDateString();
			pub_date = document.createTextNode(pub_date); 
			span.appendChild(pub_date);

			li.appendChild(a);
			li.appendChild(span);

			ol.appendChild(li); 
		}
		return ol;
	}

	function buildDashboard() {
		var dashboard_div,
			exit_anchor;

		dashboard_div = document.createElement('div'); 
		dashboard_div.setAttribute('id','skimr-dashboard');
		
		exit_anchor = document.createElement('a');
		exit_anchor.setAttribute('id', 'skimr-exit');
		exit_anchor.appendChild(document.createTextNode('Exit'));
		exit_anchor.onmouseover = function(){exit_anchor.style.cursor = 'pointer'};
		exit_anchor.onmouseout = function(){exit_anchor.style.cursor='default'};
		exit_anchor.onclick = exitApp;

		dashboard_div.appendChild(exit_anchor);

		return dashboard_div; 
	}

	function exitApp() {
		skimr_div.parentNode.removeChild(skimr_div); 
		google_tag.parentNode.removeChild(google_tag);
		
		
	//todo Delete script tag	
		//var script_tagsdocument.getElementsByTagName('head')[0].findElementsByTagName('script');
		//	for loop
		
		//Delete this object
		//delete this;
	}

})();
