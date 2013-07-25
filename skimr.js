(function(window,undefined) {
'use strict';

var entries_per_page = 50,  
    num_max_entries = 250, //Google feed API maxes out at 250
    rss_url,
    current_offset = 0;


function init () {

  ui.buildUi();

  loadGoogle( 
    determineFeedUrl.bind(null, 
      //Get only a few feeds at first
      initFeed.bind(null, entries_per_page,
        //Update UI
        processFeed.bind(null,
          // Preload rest of the feed entries 
          initFeed.bind( null, num_max_entries, 
            //Update UI
            processFeed.bind( null, null ))))));
}

// Load Google JS loader
function loadGoogle(callback) {
  var google_tag = document.createElement('script');
  google_tag.src = '//www.google.com/jsapi';
  document.querySelector('head').appendChild( google_tag );

  google_tag.addEventListener('load', function () {
    window.google.load('feeds', '1', {
      "callback": function () {
        message("Google JS loader loaded");
        callback.apply(this, Array.prototype.slice.call(arguments));
      },
      "nocss": true
    });
  });
}

//Try to find RSS URL
function determineFeedUrl(callback) {
  rss_url = getRSSLink(); //Find RSS URL

  if (rss_url) {
    callback();
  } else {
    message("Feed URL not found, using Google Feed Lookup");
    googleFeedLookup(window.location,callback);
  }
}

//Get entries of a feed
function initFeed (number_to_grab,callback) {

  //Bugfix: for some odd reason, in firefox, Google obj returns 3 as an argument
  number_to_grab === 3 && (number_to_grab = undefined);

  //if getRSSLink fails, exit app with warning to the user
  if (!rss_url) {
    error("Skimr can't work on this page");
    return;
  }

  var google_feed = new window.google.feeds.Feed(rss_url);

  //Initialise feed settings
  google_feed.setResultFormat(window.google.feeds.Feed.JSON_FORMAT);
  google_feed.includeHistoricalEntries();
  google_feed.setNumEntries(number_to_grab);
  google_feed.load(callback); 
}

//Feed processing and updating UI
function processFeed(callback,results) {
  var entries;

  //TODO WE NEED TO IMPLEMENT PROPER ERROR HANDLING
  // If feed doesn't load or doesn't exist, exit app
  if (results.status.code === 400){
    error('Woops, there is a problem with the feed');
  }

  ui.updateUi( results.feed.entries );

  callback && callback();
}


//Scans the <link> tags. Searches for type - application/rss+xml and returns
//the hypertext reference. If none, returns false
function getRSSLink () {
  var link_nodes = document.getElementsByTagName('link'),
      location = window.location, 
      rss_link = null, 
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
    window.google.feeds.lookupFeed(url,function(results){
      rss_url = results.url;
      message('Google Feed Lookup returned: ' + results.url);
      callback();
  });
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

//Generic message to user
function message (msg, callback) { ui.message (msg, callback); }
//Generic error to user
function error (msg, callback) { ui.error(msg, callback); exitApp(); }

var ui = {
  //Constants
  NAMESPACE : 'skimr',
  IDNAMESPACE : 'skimr-' ,

  entries : [], 

  //UI Elems 
  //TODO Refactor these data members out
  skimr_div : null,
  loading_div : null,
  list_table : null,
  next_anchor :null,
  prev_anchor :null,

  buildUi : function () {

    //Scroll to top
    window.scroll(0,0);

    //TODO Implement templating system 

    var fragment = document.createDocumentFragment();

    this.skimr_div = this.buildTag('div', this.NAMESPACE, '');
    var css_tag = this.buildTag('style','',this.css); 
    var dashboard_div = this.buildDashboard();
    this.loading_div = this.buildTag('div', this.IDNAMESPACE + 'loading', 'Loading...');

    this.skimr_div.appendChild( this.loading_div );
    this.skimr_div.appendChild( dashboard_div );
    this.skimr_div.appendChild( css_tag );
    fragment.appendChild( this.skimr_div );

    document.body.appendChild(fragment);

    this.attachEvents();

  },
  //Refactor so that current_result is local
  updateUi : function (current_results) {

    this.entries = current_results || this.entries; 

    //When we have results, no need for loading
    if (this.loading_div) {
      this.remElem(this.loading_div);
      delete this.loading_div;
    }


    var table = document.getElementById(this.IDNAMESPACE + 'table');
    if (table) this.remElem(table);

    this.next_anchor.className = entries_per_page >= (this.entries.length - current_offset) ? 'hide': 'show';
    this.prev_anchor.className = current_offset > 0 ? 'show' : 'hide';

    //Element that houses feed links
    this.list_table = this.buildListTable(entries_per_page);

    //Append to main element
    this.skimr_div.appendChild(this.list_table);

  },
  deleteUi : function () {
    this.remElem(this.skimr_div);
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
    var exit_anchor = buildAnchor('Exit',this.IDNAMESPACE + 'exit'); 

    //Default: hide class while preloading the next google feed results 
    this.next_anchor = buildAnchor('Next',this.IDNAMESPACE + 'next','hide');
    this.prev_anchor = buildAnchor('Prev',this.IDNAMESPACE + 'prev','hide');

    dashboard_div.appendChild(this.prev_anchor);
    dashboard_div.appendChild(exit_anchor);
    dashboard_div.appendChild(this.next_anchor);

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
    var table = document.createElement('table'),
        table_contents = "",
        pub_date,
        entries = this.entries,
        entry,
        end,
        yy,
        mm,
        dd;

    table.id = this.IDNAMESPACE + 'table';

    offset || (offset = entries_per_page); 

    // if desired offset will be more than results
    end = ((current_offset + offset) > this.entries.length ) ? 
      this.entries.length : //Just do remaining items
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

    return table;
  },
  pagination : function (offset) {

    current_offset += offset; //XXX Refactor out

    this.updateUi();
  },
  attachEvents : function () {

    this.skimr_div.addEventListener("keydown", keyEvents, false);
    this.skimr_div.addEventListener("click", clickEvents, false);

    function keyEvents (event) {
      switch (event.keyCode) {
        //Escape key
        case 27:
          exitApp();
          break;

          //Left arrow
        case 37:
          //don't go back when on first listings
          current_offset > 0 && ui.pagination(-entries_per_page); //TODO Move this logic to pagination()
          break;

          //Right
        case 39:
          //don't go forward when none lie beyond current page listings
          //TODO Move this logic to pagination()
          entries_per_page >= (this.entries.length - current_offset) || this.pagination(entries_per_page);
          break;
      }
    }

    var that = this;
    function clickEvents (event){
      var target = event.target;

      switch (target.id) {
        case 'skimr':  //Click the veil
        case 'skimr-exit':
          exitApp();
          break;
        case 'skimr-next':
          that.pagination(entries_per_page);
          break;
        case 'skimr-prev':
          that.pagination(-entries_per_page);
          break;
      }
    }
  },
  //Send message to user
  message : function (msg, callback) {
    console.log(msg);
    callback && callback();
  },
  //Send error to user
  error : function (msg, callback) {
    alert(msg);
    callback();
  },
  css : (function () {/*
    html {position: relative;}
    html,head,body {width: 100% !important; padding: 0 !important; 
      min-width: 100% !important; margin: 0 !important; max-width: 100% !important;
       min-height: 100%;}
    #skimr, #skimr * {padding: 0; margin: 0;color:#000;
       font-weight: normal;border:0; text-transform: none; text-shadow:none;
       text-align: left;font: normal normal 16px/1.2 Helvetica, Arial, Sans-Serif;}
    #skimr {position:absolute;top:0;left:0;min-height:100%;width:100%;
       zoom:100%;
      background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQI12NgYGC4DAAA2ADUwvUnWwAAAABJRU5ErkJggg==) transparent repeat;
       z-index: 99999999; padding:0 0 30px; }
    #skimr-loading {width: 100%; background-color: #FFF; color: #000;text-align: center;}
    #skimr-dashboard {width: 100%; background-color: #fff; color: #ddd;position: fixed; bottom: 0; left: 0; text-align: center; }
    #skimr a {text-decoration: underline;}
    #skimr-dashboard a {margin-left: 5px;}
    #skimr-dashboard .hide {visibility: hidden;}
    #skimr-table {background-color: #EFEFEF; max-width: 1000px; margin: 0 auto;
      border-radius:4px;margin-top:20px;width:auto;
      border-collapse: separate;border-spacing: 0;
      background-image: gradient( linear, left 40, left top,
      color-stop(0.34, rgb(239,239,239)), color-stop(0.77, rgb(221,221,221)),
      color-stop(0.94, rgb(222,222,222))); }
    #skimr-table th {font: normal 1.2em/1.8 Corbel, "Lucida Sans Unicode", "Lucida Grade", "Bitstream Vera Sans", "Luxi Serif", Verdana, sans-serif; text-shadow: 2px 2px 3px #aaa;}
    #skimr-table th:first-child {padding: 0 0 0 5px; font-size: 1em;}
    #skimr-table th:last-child { text-align: right;padding-right: 14px}
    #skimr-table a {color: #333; text-decoration:none; display: block; padding-left:6px;}
    #skimr-table a:hover {color: #333;}
    #skimr-table tr:hover td:first-child {border-right: solid 1px #efefef;border-bottom: solid 1px #ccc;}
    #skimr-table tr:hover td {background-color:#CFCFCF;}
    #skimr-table td:first-child {color: #777; font-size: 0.9em;text-align: center; border-right: solid 1px #ccc; border-bottom:solid 1px #efefef;}
    #skimr-table td {line-height: 2.7;}
    #skimr-table td:last-child {padding: 0 7px 0 0; border-bottom: solid 1px #ccc;}
    #skimr-table tr:last-child:hover td:first-child {border-bottom-left-radius:4px;}
    #skimr-table tr:last-child:hover td:last-child {border-bottom-right-radius:4px;}
    #skimr-table tr:last-child td {padding-bottom: 2px; border-bottom: 0;}
  */}).toString().match(/(?:\/\*)([^]*)(?:\*\/)/)[1]
};


//Expose skimr methods to the global namespace
window.skimr = {
  exitApp : exitApp,
  init: init,
  pagination: ui.pagination,
};

//INIT
init();

})(window);
