(function(window,undefined) {
'use strict';

//RUNTIME SCRIPT - Script body runs here and calls functions that reside lower down
//PART 1

// Google object
var	google,

//Created document and UI elements
		google_tag,
		css_tag,
		skimr_div,//container div
		loading_div,
		list_table,
		dashboard_div,
		exit_anchor,
		next_anchor,
		prev_anchor,

//Private Properties
		entries_per_page = 50,  //Entries per page
		num_max_entries = 250, //Google feed API maxes out at 250
		rss_url,
		current_offset = 0,
		current_results = null,
		current_results_length = 0;


//Initilisation
function init () {

	var fragment = document.createDocumentFragment();

	google_tag = buildGoogleTag();
	document.getElementsByTagName('head')[0].appendChild( google_tag );
	
	rss_url = getRSSLink(); //Find RSS URL

	//if getRSSLink fails, exit app with warning to the user
	if (!rss_url) {
		alert("Skimr can't work on this page");
		exitApp();
		return;
	}
	//TODO: make warning be sliding box. Unobtrusive warning;

	//Scroll to top
	window.scroll(0,0);
	
	skimr_div = buildSkimrDiv();//Veil
	fragment.appendChild( skimr_div );
	css_tag = buildCss(); 	//Add CSS style tag 
	loading_div = buildLoadingDiv(); //Add loading message to body tag
	dashboard_div = buildDashboard();

	skimr_div.appendChild( loading_div );
	skimr_div.appendChild( dashboard_div );
	skimr_div.appendChild( css_tag );

	document.body.appendChild(fragment);

	//Set events to UI
	eventDelegation(skimr_div);
	
	//Check to see if the google tag is loaded
	//and pass loadFeedAPI
	assetReady(google_tag, function () {

			//Move google loader object into local scope
			google = window.google;

			google.load('feeds', '1', {
				"callback": initFeed, //Once the feed api is loaded, it calls initFeed() 
				"nocss": true
				});

		});
}

// (re)initalise the feed
function initFeed (num,callback) {
	var google_feed; //Google Feed object
	
	//Bugfix: for some odd reason, in firefox, Google obj returns 3 as an argument
	num === 3 && (num = undefined);

	//Number of entries to request
	//Default to default entries per page if none specified, the number used for first page
	num || (num = entries_per_page); //Faster http://jsperf.com/conditional-assignment 

	//Callback to be called once feed has been received by GoogFeedAPI
	//Default to postFeedInit
	callback || (callback = postFeedInit);
	google_feed = new google.feeds.Feed(rss_url);
	
	//Initialise feed settings
	google_feed.setResultFormat(google.feeds.Feed.JSON_FORMAT);
	google_feed.includeHistoricalEntries();
	google_feed.setNumEntries(num);
	//Once feed is loaded, callback funtion. Default: postFeedInit
	google_feed.load(callback);
}

//What to do once feed has been initialised
//var results is passed for the google feed api (see initFeed)
function postFeedInit (results) {
	var entries;
	

	//TODO WE NEED TO IMPLEMENT PROPER ERROR HANDLING
	//TODO If we do implement error handling, move to program code, not methods. I think...
	// If feed doesn't load or doesn't exist, exit app
	if (results.status.code === 400){
		alert('Woops, there is a problem with the feed'); 
		exitApp();
		//throw 'Feed 404';// TODO MUST CATCH
	}
	
	//Once the feed is initialissed, no need for loading msg
	remNode(loading_div);

	
	//Update skimr class properties
	current_results = results.feed.entries; 
	current_results_length = current_results.length;

	//Element that houses feed links
	list_table = buildListTable();
	//Append to main element
	skimr_div.appendChild(list_table);


	//Preload remaining for pagination
	initFeed(num_max_entries,function (){
		//For some reason, when sending this fucntion as a callback,
		//the returned results object is 'this'. The old results object
		//is still return. There are now two result objects within the
		//scope. Weird, huh?
		current_results = this.feed.entries;
		current_results_length = current_results.length;

		//Allow Pagination via next button
		 (current_results_length > entries_per_page) && next_anchor.className = 'show'; 
		 });
}

function pagination (offset) {

	current_offset += offset;

	next_anchor.className = offset >= (current_results_length - current_offset) ? 'hide': 'show';
	prev_anchor.className = current_offset > 0 ? 'show' : 'hide';
	remNode(document.getElementById('skimr-table'));
	list_table = buildListTable(offset); //Rebuild link list
	skimr_div.appendChild(list_table);
	
}

//Attaches events to UI
function eventDelegation (elem) {
	elem.onclick = function (event){
		var target;
		event || (event = window.event); //For IE. Ew...
		target = event.target || event.src; //W3C || IE. Ewy.. Gross...  

		switch (target.id) {
			case 'skimr-exit':
			exitApp();
			break;
			case 'skimr-next':
			pagination(entries_per_page);
			break;
			case 'skimr-prev':
			pagination(-entries_per_page);
			break;

		};
	}
}

//Scans the <link> tags. Searches for type - application/rss+xml and returns
//the hypertext reference. If none, returns false
function getRSSLink () {
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
	return rss_link || googleFeedLookup(location); //google feed lookup as backup
}

function googleFeedLookup (url){
	return assetReady(google_tag, function(){

		google.feeds.lookupFeed(url,function(results){
			var feed = results.url || false;
			console.log('Google Feed Lookup returned: ',feed)
			return feed;
		});
	});
}

//builds that tag that will load the google api
function buildGoogleTag (){ 
	var google_tag = document.createElement('script');
	google_tag.src = 'https://www.google.com/jsapi';
	return google_tag;
}

//Create loading div element
function buildLoadingDiv (){
	var div = document.createElement('div');

	div.id = 'skimr-loading';
	(div.innerContent) ?
		div.innerContent = 'Loading...' : //W3C  
		div.innerText = 'Loading...'; //IE (ewwww)

	return div;
}

function buildSkimrDiv (){ //Veil
	var div = document.createElement('div');
	div.id = 'skimr';
	return div;
}

function buildCss () {
	var css,
			css_tag;

		css = 
			//RESETS		
		'html {position: relative;}\n'//For full page veil

		+ 'html,head,body {width: 100% !important; padding: 0 !important; '
			+ 'min-width: 100% !important; margin: 0 !important; '
			+ 'max-width: 100% !important; min-height: 100%;}\n'//For full page veil

		+ '#skimr, #skimr * {padding: 0; margin: 0;color:#000; font-weight: normal;}\n' // reset

		+ '#skimr {position:absolute;top:0;left:0;min-height:100%;width:100%; '
			+ 'background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE'
			+ 'AAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGC4DAAA2ADUwvUnWwAAAABJRU5E'
			+ 'rkJggg==) transparent repeat; '
			+ 'z-index: 99999999; '
			//+ 'overflow: auto;'//clearfix
			+ 'padding:0 0 30px;'//For Dashbar
			+ 'font: normal normal 16px/1.2 Helvetica, Arial, Sans-Serif; }\n'//cont'd

		+ '#skimr-loading {width: 100%; background-color: #FFF; color: #000;' 
			+ 'text-align: center;}\n'//cont'd

		+ '#skimr-dashboard {width: 100%; background-color: #fff; color: #ddd;' 
			+ 'position: fixed; bottom: 0; left: 0; text-align: center; }\n'

		+ '#skimr a {text-decoration: underline;}'

		+ '#skimr-dashboard a {margin-left: 5px;}'

		+ '#skimr-dashboard .hide {visibility: hidden;}'

		+ '#skimr-table {background-color: #EFEFEF; max-width: 1000px; margin: 0 auto; '
			+ 'border:solid 5px #EFEFEF;'
			+ '-webkit-border-radius:5px;-moz-border-radius:5px;border-radius:5px;'
			+ 'margin-top:20px;'
			+ 'text-align: left;border-collapse:separate; }\n' 

		+ '#skimr-table th {font-weight: normal; text-align:center;}\n'//cont'd

		+ '#skimr-table a {color: #444; display: block; padding: 3px 0;}\n';


	css_tag = document.createElement('style'); 

	try {
		css_tag.appendChild(document.createTextNode(css) ); //W3C
	} catch (e) {
		if (css_tag.styleSheet) { //IE. Ew.
			css_tag.styleSheet.cssText =  css;
		}
	}
	return css_tag;
}

function buildListTable (offset) {
	var fragment = document.createDocumentFragment(),
			table = document.createElement('table'),
			table_contents = "",
			pub_date,
			entries,
			entry,
			end,
			yy,
			mm,
			dd;
	
	fragment.appendChild(table);
	table.id = 'skimr-table';

	offset || (offset = entries_per_page); // If no offset given, default entries per page
	entries = current_results;

	end = ((current_offset + offset) > current_results_length) ? // if desired offset will be more than results
		current_results_length : //Just do remaining items
		current_offset + Math.abs(offset); 

	//console.log('current_off: ',current_offset); //xxx
	//console.log('offset: ', offset); //xxx
	//console.log(current_offset, ', end: ',  end) //xxx

	
	//Creates anchor tags, adds hypertext reference
	for (var i = current_offset; i < end; i++) { 
		entry = entries[i];

		pub_date = new Date(entry.publishedDate);

		yy = pub_date.getFullYear().toString(10).substring(2);
		mm = (pub_date.getMonth() + 1).toString(10);
		mm = mm.length == 1 ? "0" + mm : mm; //padding zero to month
		dd = (pub_date.getDate() + 1).toString(10);
		dd = dd.length == 1 ? "0" + dd : dd; //padding zero to day
		
		table_contents += '<tr><td>' +  yy + '/' + mm + '/' + dd + '</td> ' + 
			'<td><a href="' + entry.link + '"> ' + entry.title + '</a></td></tr>\n';
	}

	table.innerHTML = '<tr><th>yy/mm/dd</strong></th>' +
			'<th id="skimr-title">Title</th></tr>\n' + table_contents;

	return fragment;
}

function buildDashboard () {
	var fragment = document.createDocumentFragment(),
			dashboard_div = document.createElement('div');

	fragment.appendChild(dashboard_div);
	dashboard_div.id = 'skimr-dashboard';
	
	exit_anchor = buildAnchor('Exit','skimr-exit'); 
	//Default: hide class while preloading the next google feed results 
	next_anchor = buildAnchor('Next','skimr-next','hide');
	prev_anchor = buildAnchor('Prev','skimr-prev','hide');

	dashboard_div.appendChild(prev_anchor);
	dashboard_div.appendChild(exit_anchor);
	dashboard_div.appendChild(next_anchor);

	return fragment; 

}

function exitApp () {

	remNode(skimr_div);
	remNode(css_tag);
	remNode(google_tag);
	remNode(window.skimr_script);

	//Delete global object;
	window.skimr && (delete window.skimr);
	

	//Delete script tag created by outside run script
	window.skimr_script && (delete window.skimr_script); 
	//For outside run script test (window.skmir.exitApp)
	return true;

}

//Helper functions
function remNode(elem) {//If fails, returns false
	return elem && elem.parentNode.removeChild(elem);
}
function buildAnchor (title,id,className) {
	var document = window.document,
			anchor = document.createElement('a');
	anchor.href = '#';
	anchor.appendChild(document.createTextNode(title));
	id && (anchor.id = id);
	className && (anchor.className = className);
	return anchor;
}
//Run fn when given asset is  loaded
function assetReady(asset,fn) {
	//the Google JS API is weird and takes a while to load,
	//so we need to be sure to load it completely before we continue, hence the onload.
	//http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
	if (asset.readyState){  //IE
		asset.onreadystatechange = function(){
		if (asset.readyState == "loaded" ||asset.readyState == "complete"){
				asset.onreadystatechange = null;
				return fn();
			}
		};
	} else {  //Other browsers, the decent and good ones (not IE)
		google_tag.onload = function(){
			return fn();
		};
	}
}

//Expose skimr methods to the global namespace
window.skimr = {
	exitApp : exitApp,
	init:	init,
	pagination: pagination,
	assetReady: assetReady
}

//INIT
init();

})(window);
