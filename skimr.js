(function() {
 	

	
 	//Scans the <link> tags. Searches for type - application/rss+xml and returns
 	//the hypertext reference. If none, returns false
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
		var open = request.open("GET",rss_url,false);
		//console.log(rss_url);
		//console.log(open);
		//request.open('GET', rss_url, FALSE);
		request.send('');
		
		return request.responseXML;
	}
 
	var rss_url = 'mashable.xml';//getRSSLink(); xxx TODO 
 	var RSSDoc = getRSSDoc (rss_url);
	 console.log(RSSDoc);
 } )();
