(function () {
	

	var rss_url = getRSSLink(); 

	console.log(rss_url);
	//var rss_url = 'mashable.xml';//getRSSLink(); 
	 var rss_doc = getRSSDoc(rss_url);
	console.log(rss_doc);
	
	//TODO clean this up, prevent erros
	var rss_title = rss_doc.getElementsByTagName('title')[0].firstChild.nodeValue;

	//var rss_desc = rss_doc.getElementsByTagName('description')[0].firstChild.nodeValue;
	//console.log(typeof rss_desc);

	var items =	rss_doc.getElementsByTagName('item');
	//console.log(items);
	var parsed_items = parseItems(items);
	//console.log(parseItems(items));
	var html = buildHtmlNodes(parsed_items);
 	var css = buildCss();

	document.body.appendChild(css);
	document.body.appendChild(html);
 	//Scans the <link> tags. Searches for type - application/rss+xml and returns
 	//the hypertext reference. If none, returns false
 	//
	function getRSSLink () {
		var	link_nodes = document.getElementsByTagName('link'),
			rss_link;

		var n = link_nodes.length;
		for (var i = 0; i < n ; i++) {

			var current_node = link_nodes[i];

			if (current_node.getAttribute('type') == 'application/rss+xml') {
				return rss_link = current_node.getAttribute('href');
			}
		}
		return false;
	}
 	
	//Gets the RSS document via AJAX and then returns it as a xml object
	function getRSSDoc(rss_url){
		//TODO Make compatible with IE
		

		var request = new XMLHttpRequest();
		var open = request.open("GET",rss_url,false); //TODO Convert to ASYNC so as to not lock up user's screen. Make sure to add a little waiting widget.
		//var open = request.open("GET",rss_url,true); //xxx
		//console.log(rss_url);
		//console.log(open);
		//request.open('GET', rss_url, FALSE);
		request.send('');
		
		return request.responseXML;
	}
 
 	function parseItems(items) {
		var parsedItems = [];
		//console.log(items)
		//console.log('parseItems');
 		var n = items.length;
 		for (var i = 0; i < n; i++) {
 			parsedItems.push(getMeatyParts(items[i]));

			 //console.log(items[i]);
		}

		return parsedItems;
	}
	

	//Gets all the elements from a single RSS item
	function getMeatyParts(single_item) {
		
		var parsed = {},
			wanted_values = ['title','description','link','pubDate'], //Childnode values to retrieve
			value;

		parsed = getValues(single_item,wanted_values)
		return parsed;


		function getValues(element,wanted_values) {
			var tags, 
				values = {};

			for(key in wanted_values) {
				tag = wanted_values[key]
				
				//add values of text nodes to object literal or array.. Not sure what
				//it is, I assume the former
				values[tag] = element.getElementsByTagName(tag)[0].firstChild.nodeValue;
			}
			return values;
		}

	}
	
	function buildCss() {
		var css;
//CSS START
		css = 
'#skimr \{\n\
	position: absolute;\n\
	top:0;\n\
	right:middle;\n\
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

	function buildHtmlNodes(parsed_items) {
		var html;

		var div = document.createElement('div');
		div.setAttribute('id', 'skimr')

		//Creates anchor tags, adds hypertext reference
		var n = parsed_items.length;
		for (var i = 0; i < n; i++) {
			var item = parsed_items[i],
				a = document.createElement('a');

			a.setAttribute('href',item.link);

			var title = document.createTextNode(item.title);
			a.appendChild(title);

			div.appendChild(a);
		}
		return div;
	}
 })();




