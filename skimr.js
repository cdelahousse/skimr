(function(window,undefined) {
'use strict';

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
		rss_urls = {},
		current_offset = 0,
		current_results = null;


//Initilisation
function init () {

	google_tag = buildGoogleTag();
	document.getElementsByTagName('head')[0].appendChild( google_tag );
	
	//Check to see if the google tag is loaded
	//and pass loadFeedAPI
	assetReady(google_tag, function () {

			//Move google loader object into local scope
			google = window.google;

			google.load('feeds', '1', {
				"callback": setUpFeedURL, //Once the feed api is loaded, it calls initFeed() 
				"nocss": true
				});

		});

	ui.buildUi();

	//Set events
	eventDelegation();
}
//Try to find RSS URL
function setUpFeedURL() {
	rss_url = getRSSLink(); //Find RSS URL
	
	//run googleFeedLookup if no <link> rss exists
	
	rss_url ? initFeed() : googleFeedLookup(window.location,initFeed);

}
// (re)initalise the feed using google feed api
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

	//if getRSSLink fails, exit app with warning to the user
	if (!rss_url) {
		alert("Skimr can't work on this page");
		exitApp();
		return;
	}

	//TODO: make warning be sliding box. Unobtrusive warning;

	google_feed = new google.feeds.Feed(rss_url);
	
	//Initialise feed settings
	google_feed.setResultFormat(google.feeds.Feed.JSON_FORMAT);
	google_feed.includeHistoricalEntries();
	google_feed.setNumEntries(num);
	google_feed.load(callback); //Default callback: postFeedInit
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
	
	//Update skimr class properties
	current_results = results.feed.entries; 

  //TODO THIS IS WHERE NEW RESULTS SHOULD BE PASSED IN
  ui.updateUi( results.feed.entries );

	//Preload remaining for pagination
	initFeed(num_max_entries,function (){
		current_results = this.feed.entries;
    //XXX SHOULD BE THIS ui.updateUi( results.feed.entries );

		//Allow Pagination via next button
		// TODO Refactor this out
    current_results.length >= entries_per_page && (next_anchor.className = 'show');
  });
}

//Attaches events to UI
function eventDelegation () {

	var doc = document;
	if (doc.addEventListener){ //W3c
		doc.addEventListener("keydown", keyEvents, false);
		doc.addEventListener("click", clickEvents, false);
	}
	else if (doc.attachEvent){ //IE, ew... 
		doc.attachEvent("onkeydown", keyEvents);
		doc.attachEvent("onclick", clickEvents);
	}

	//Keyboard Events	
	function keyEvents (event) {
		event || (event = window.event); //Handle IE window.event. Ew...


		switch (event.keyCode) {
			//Escape key
			case 27:
				exitApp();
				break;

			//Left arrow
			case 37:
				//don't go back when on first listings
				current_offset > 0 && ui.pagination(-entries_per_page);
				break;

			//Right
			case 39:
				//don't go forward when none lie beyond current page listings
				entries_per_page >= (current_results.length - current_offset) || ui.pagination(entries_per_page);
				break;
		}
	}

	//Click Events
	function clickEvents (event){
		event || (event = window.event); //For IE. Ew...
		var target = event.target || event.src; //W3C || IE. Ewy.. Gross... 

		switch (target.id) {
			case 'skimr-exit':
			exitApp();
			break;
			case 'skimr-next':
			ui.pagination(entries_per_page);
			break;
			case 'skimr-prev':
			ui.pagination(-entries_per_page);
			break;
		}
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

		//Get first RSS or Atom match
		if (node_type == 'application/rss+xml' || node_type == 'application/atom+xml') {

			rss_link = current_node.getAttribute('href');

			//If it's not a full on URL, we need to convert it to one
			if (!rss_link.match(/^http/)) {
				var absolute_path = (rss_link.match(/^\//)) ? '': location.pathname;
				rss_link = location.protocol + '//' + location.hostname + absolute_path + rss_link;
			}
			//If we've found a link, we don't need to continue looping
			break;
		}
	}
	return rss_link;
}

//Use feed api to find feed URL
function googleFeedLookup (url,callback){
		google.feeds.lookupFeed(url,function(results){
			rss_url = results.url;
			console.log('Google Feed Lookup returned: ',results.url)
			callback();
	});
}

//builds that tag that will load the google api
function buildGoogleTag (){ 
	var google_tag = document.createElement('script');
	google_tag.src = 'https://www.google.com/jsapi';
	return google_tag;
}


function exitApp () {

  ui.deleteUi();

	//Delete global object;
	window.skimr && (delete window.skimr);
	
  skimr_script && skimr_script.parentNode.removeChild( skimr_script );
	//Delete script tag created by outside run script
	window.skimr_script && (delete window.skimr_script); 
	//For outside run script test (window.skmir.exitApp)
	return true;

}

//Run fn when given asset is  loaded
function assetReady(asset,fn) {
	//the Google JS API is weird and takes a while to load,
	//so we need to be sure to load it completely before we continue, hence the onload.
	//http://www.nczonline.net/blog/2009/07/28/the-best-way-to-load-external-javascript/
	//Note: I DID NOT TEST THIS IN IE
	if (asset.readyState){  //IE
		asset.onreadystatechange = function(){
		if (asset.readyState == "loaded" ||asset.readyState == "complete"){
				asset.onreadystatechange = null;
				return fn();
			}
		};
	} else {  //Other browsers, the decent and good ones (not IE)
		asset.addEventListener('load',fn);
	}
}

var ui = {
  //Constants
  NAMESPACE : 'skimr',
  IDNAMESPACE : 'skimr-' ,
  current_results : [],
  buildUi : function () {

    //Scroll to top
    window.scroll(0,0);

    //TODO Implement templating system 
   
    var fragment = document.createDocumentFragment();

    skimr_div = this.buildTag('div', this.NAMESPACE, '');
    css_tag = this.buildCssTag();	//Add CSS style tag 
    loading_div = this.buildTag('div', this.IDNAMESPACE + 'loading', 'Loading...');
    dashboard_div = this.buildDashboard();

    fragment.appendChild( skimr_div );
    skimr_div.appendChild( loading_div );
    skimr_div.appendChild( dashboard_div );
    skimr_div.appendChild( css_tag );

    document.body.appendChild(fragment);

  },
  //Refactor so that current_result is local
  updateUi : function (current_results) {
    if (loading_div) {
      this.remElem(loading_div);
      loading_div = undefined;
    }

    //Element that houses feed links
    list_table = this.buildListTable();
    //Append to main element
    skimr_div.appendChild(list_table);

  },
  deleteUi : function () {
    this.remElem(skimr_div);
    this.remElem(css_tag);
    this.remElem(google_tag);

  },
  remElem : function (elem) {
    return elem && elem.parentNode.removeChild(elem);
  },
  buildTag : function (type, id, content) {
    var elem = document.createElement(type);
    elem.id = id;
    elem.innerHTML = content;
    return elem;
  },
  buildDashboard : function () {
    var dashboard_div = this.buildTag('div', this.IDNAMESPACE + 'dashboard', ''); 

    var buildAnchor = this.buildAnchor;
    exit_anchor = buildAnchor('Exit',this.IDNAMESPACE + 'exit'); 
    //Default: hide class while preloading the next google feed results 
    next_anchor = buildAnchor('Next',this.IDNAMESPACE + 'next','hide');
    prev_anchor = buildAnchor('Prev',this.IDNAMESPACE + 'prev','hide');

    dashboard_div.appendChild(prev_anchor);
    dashboard_div.appendChild(exit_anchor);
    dashboard_div.appendChild(next_anchor);

    return dashboard_div; 

  },
  buildAnchor : function (title,id,className) {
    var document = window.document,
        anchor = document.createElement('a');
    anchor.href = '#';
    anchor.appendChild(document.createTextNode(title));
    id && (anchor.id = id);
    className && (anchor.className = className);
    return anchor;
  },
  buildListTable : function buildListTable (offset) {
    var fragment = document.createDocumentFragment(),
        table = document.createElement('table'),
        table_contents = "",
        pub_date,
        entries = current_results,
        entry,
        end,
        yy,
        mm,
        dd;
    
    fragment.appendChild(table);
    table.id = this.IDNAMESPACE + 'table';

    offset || (offset = entries_per_page); // If no offset given, default entries per page

    end = ((current_offset + offset) > current_results.length) ? // if desired offset will be more than results
      current_results.length : //Just do remaining items
      current_offset + Math.abs(offset); 

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

    table.innerHTML = '<tr><th>yy/mm/dd</th>' +
        '<th id="skimr-title">Skimr</th></tr>\n' + table_contents;

    return fragment;
  },
  pagination : function (offset) {

    current_offset += offset;

    next_anchor.className = offset >= (current_results.length - current_offset) ? 'hide': 'show';
    prev_anchor.className = current_offset > 0 ? 'show' : 'hide';
    this.remElem(document.getElementById(this.IDNAMESPACE + 'table'));
    list_table = this.buildListTable(offset); //Rebuild link list
    skimr_div.appendChild(list_table);
  },
  buildCssTag : function () {
    var css,
        css_tag;

      css = 
        //RESETS		
      'html {position: relative;}\n'//For full page veil

      + 'html,head,body {width: 100% !important; padding: 0 !important; '
        + 'min-width: 100% !important; margin: 0 !important; '
        + 'max-width: 100% !important; min-height: 100%;}\n'//For full page veil

      + '#skimr, #skimr * {padding: 0; margin: 0;color:#000; font-weight: normal;'
        + 'border:0; text-transform: none; text-shadow:none; text-align: left;' // reset
        + 'font: normal normal 16px/1.2 Helvetica, Arial, Sans-Serif;}\n'//cont'd


      + '#skimr {position:absolute;top:0;left:0;min-height:100%;width:100%; '
        + 'zoom:100%;'
        + 'background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAE'
        + 'AAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGC4DAAA2ADUwvUnWwAAAABJRU5E'
        + 'rkJggg==) transparent repeat; '
        + 'z-index: 99999999; '
        + 'padding:0 0 30px;'//For Dashbar
        + ' }\n'//cont'd

        //+ 'font: normal normal 16px/1.2 Helvetica, Arial, Sans-Serif; }\n'//cont'd

      + '#skimr-loading {width: 100%; background-color: #FFF; color: #000;' 
        + 'text-align: center;}\n'//cont'd

      + '#skimr-dashboard {width: 100%; background-color: #fff; color: #ddd;' 
        + 'position: fixed; bottom: 0; left: 0; text-align: center; }\n'

      + '#skimr a {text-decoration: underline;}'

      + '#skimr-dashboard a {margin-left: 5px;}'

      + '#skimr-dashboard .hide {visibility: hidden;}'

      + '#skimr-table {background-color: #EFEFEF; max-width: 1000px; margin: 0 auto; '
        + '-webkit-border-radius:10px;-moz-border-radius:10px;border-radius:10px;'
        + 'margin-top:20px;width:auto;'
        + 'border-collapse: separate;border-spacing: 0;'
        + 'background-image: -webkit-gradient( linear, left 40, left top, color-stop(0.34, rgb(239,239,239)), color-stop(0.77, rgb(221,221,221)), color-stop(0.94, rgb(222,222,222))); background-image: -moz-linear-gradient( center 40, rgb(239,239,239) 34%, rgb(221,221,221) 77%, rgb(222,222,222) 94%);'
        + '}\n' 

      + '#skimr-table th {font: normal 1.2em/1.8 Corbel, "Lucida Sans Unicode", "Lucida Grade", "Bitstream Vera Sans", "Luxi Serif", Verdana, sans-serif; text-shadow: 2px 2px 3px #aaa;}\n'

      + '#skimr-table th:first-child {padding: 0 0 0 5px; font-size: 1em;}\n'

      + '#skimr-table th:last-child { text-align: right;padding-right: 14px}\n'

      + '#skimr-table a {color: #333; text-decoration:none; display: block; padding-left:6px;}\n'

      + '#skimr-table a:hover {color: #333;}\n'

      + '#skimr-table tr:hover td:first-child {border-right: solid 1px #efefef;border-bottom: solid 1px #ccc;}\n'

      + '#skimr-table tr:hover td \{background-color:#CFCFCF;}\n' 

      + '#skimr-table td:first-child {color: #777; font-size: 0.9em;text-align: center; border-right: solid 1px #ccc; border-bottom:solid 1px #efefef;}\n'

      + '#skimr-table td {line-height: 2.7;}\n'

      + '#skimr-table td:last-child {padding: 0 7px 0 0; border-bottom: solid 1px #ccc;}\n'

      + '#skimr-table tr:last-child:hover td:first-child {-webkit-border-bottom-left-radius:10px;-moz-border-bottom-left-radius:10px;border-bottom-left-radius:10px;}\n'
      
      + '#skimr-table tr:last-child:hover td:last-child {-webkit-border-bottom-right-radius:10px;-moz-border-bottom-right-radius:10px;border-bottom-right-radius:10px;}\n'


      + '#skimr-table tr:last-child td {padding-bottom: 2px; border-bottom: 0;}\n';


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
}


//Expose skimr methods to the global namespace
window.skimr = {
	exitApp : exitApp,
	init:	init,
	pagination: ui.pagination,
	assetReady: assetReady
}

//INIT
init();

})(window);
