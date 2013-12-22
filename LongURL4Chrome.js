// <![CDATA[
// ==UserScript==
// @name LongURL
// @description LongURL replace shortened links using LongURL API !
// @author TiTi, ddavison
// @version 2.0
// @date 2010-05-10
// @licence WTFPL; http://sam.zoy.org/wtfpl/
// @namespace http://userscripts.org/scripts/show/52584, http://github.com/ddavison/longurl-extension
// @include http://*
// @include https://*
// @exclude http://longurl.org/*
// @exclude http://userscripts.org/scripts/show/52584, http://github.com/ddavison/longurl-extension
// ==/UserScript==

/* jshint sub:true */

/*
This script is using the LongURL API : http://longurl.org/api

By default, this script replace the href="" attribute of the link with the long url.
->This means your browser won't call the url shortener website when you'll click the link.
This is voluntary, because thoses services are useless and dangerous : obfuscation act like a third DNS resolver.
See : http://www.codinghorror.com/blog/archives/001276.html
By default this script also replace the content of the a tag (visible text) with the title of the page.

I think the expand function - as seen in twitter search results for instance - is boring and useless for the user.
Plus there's the security problem with the shortened links.
Several possibilities :
-Call the API each time needed (onmouseover) ; but user have to wait & can rapidly click (before xhr return the long-url)
-Request at page load if there is a/some link(s) in the page, in order to process tiny url
  -In that case don't forget to take car of new data (ajax)
=> My script is using the second possibility.

== Opera issues ==
Another problem : Opera XML Store only works with Widgets... so we cannot store the list of supported services for now.
I know we can emulate GM functions, see http://www.howtocreate.co.uk/operaStuff/userJavaScript.html
But: using cookies is not cool. It's a workaround for a domain for sure, but it is not clean.
Therefore two possibilities :
-Request a list of know services each time this user script is called (=> for each web page you visit!) ; downside = network call (cost time + load[for longurl.org])
-Write the list in plain text in the code ; downside = not updated, but js callback simply won't work if long url return an error [not dramatic]
=> That second solution is not too bad.

I'm using the JSON syntax for objects (aka 'Literal Object', recommended by experts like Douglas Crockford).
I'm using unintrusive dynamic script nodes [not anymore for GreaseMonkey users] : http://tech.bluesmoon.info/2006/10/unintrusive-dynamic-script-nodes.html

This script is mainly targetted for Opera users.
It seems user scripts also work with others browsers than Opera & GreaseMonkey, like Safari, Chrome or IE.
I'll be happy to take a look... if I've got enough time! If the script doesn't work, please send me a message.
... So here we are, Chrome version for 1.6 :) Chrome extensions mecanism involve another architecture, so I had to cut my script in various parts between background.html, popup.html, options.html & LongURL4Chrome.js ; but it think it's more efficient right now ...

To send me comments or questions : anth.ibug at gmail.

------------------
TODO:

-Google Chrome version need better comments and code explanation, better variables name, better architecture?, ...

-que faire si le site dÃ©truit ma div :-( possible ?
-make it work for cloned nodes, see checkLink function
-Problems with the tooltip on the borders of the screen (not visible)
-update services list...

------------------
CHANGELOG:

1.9 :
-Services list is now dynamically fetched from http://api.longurl.org/v2/services?format=json at browser start
=> No need to update extension to get longurl.org changes \o/
-Simplify code
-Non-invasive: remove attribute checkLongURL which was previously added on all links
-Progressive checking to avoid freeze when lots of DOM nodes are added or moved (performance improvment)

1.8 :
-Updated services list: ~100 services added!
-jshint passed
-Google Chrome manifest v2 -> script extracted to external .js files
-Services list moved to background in prevision for future
-Commented example for forceVisibleHref, because no more working on options page
-Compute servicesCount & display in popup

1.7 : [only for Google Chrome]
-Added localStorage to preserve settings when the browser is closed

1.6 : [only for Google Chrome]
-Chrome extension version
-zIndex & wordWrap style for tooltip
-Services list updated (235)

1.5 :
-Prevent memory leak, see http://ajaxian.com/archives/dynamic-script-generation-and-memory-leaks

1.4 :
-optimize showTooltip function -> 10x faster with ff \o/ (mouse over -> tooltip time to appear)
-remove processRequest & showTooltip useless parameter (json), using LongURL.storedRequests[url] instead
-added GM_xmlhttpRequest for FF users ; remove use of unsafeWindow :) ; use of JSON.parse if supported
-added try-catch block

-Still don't understand why it's not working with 'Twitter Sidebar Replies', processRequest is called, and modify DOM ! But no repercusion on the screen, W.T.F. ?
-tweetbe.at is working with Opera, not with Firefox, why ? +really slow with FF

1.3 :
-added option storedRequests
-reduce number of requests by storing results
-Tried to make the script work with 'Twitter Sidebar Replies' userscript - http://userscripts.org/scripts/show/36635
-> Concerning GreaseMonkey user only, because this script doesn't work with Opera.
But somehow firefox refuse to create the network request after script injection : with firebug check html->head->scripts...
Thoses scripts which stay indicate 'Failed to load source for'. Really weird = clic edit, add a character and remove it rapidly, clic edit(stop) -> ff load the script and execute it perfectly, url is replaced ! WTF ?! (first comment line 145 to avoid js error)

1.2 :
-added ajax support :) - Examples : 'more' button on twitter, tweetbe.at, twitter100.com, ...
-added option : showPopup
-added option : forceVisibleHref
-reduce 'Media type' font size in the tooltip
-exclude http://longurl.org/*
-exclude the userscript.org tutorial itself ^^

1.1 :
-added https support (concern only GreaseMonkey users)
-reduce alpha transparency of the popup

1.0 : Initial release
------------------
*/

var tooltip = 
{
  content: null, // tooltip div element
  create: function(tooltipWidth)
  {
    var tc = document.createElement('div');
    tc.setAttribute('id', 'LongURL_tooltip');
    tc.style.position = 'absolute';
    tc.style.textAlign = 'left';
    tc.style.zIndex = '999';
    tc.style.wordWrap = 'break-word';
    tc.style.display = 'none';
    // tc.style.opacity = '0.9';
    tc.style.backgroundColor = '#FFF';
    tc.style.width = tooltipWidth + 'px';
    tc.style.padding = '4px';
    tc.style['-webkit-border-radius'] = '7px';
    tc.style.border = "1px solid #000";
    tooltip.content = tc;
    document.body.appendChild(tooltip.content);
  },
  show: function(tinyurl)
  {
    var json = waitingItems[tinyurl].data;
    
    var temp = '<strong>LongURL:</strong> <a href="' + json['long-url'] + '" style="font-size:15px">' + json['long-url'] + '</a><br />';
    temp += "<em style='font-size: 9px;'>Shortened URL: <a href=''>" + tinyurl + "</a></em><br />";
    // Not shown : response-code (always 200 here)

    temp += "<strong># of redirects:</strong> " + (json['all-redirects'].length -1);
    
    tooltip.content.innerHTML = temp; // Only one .innerHTML  = good perf.
    tooltip.content.style.display = 'block';
  },
  hide: function()
  {
    tooltip.content.style.display = 'none';
  }
};

// Get data from background.html & process it
function prepareRequest(a)
{
  if(waitingItems[a.href]) // Is this url already there in the same page?
  {
    if(waitingItems[a.href].data === null) // Is this url currently processed?
    {
      var t = waitingItems[a.href].WItems;
      t[t.length] = a; // Add the link the the waitingItems list for future processing
    }
    else // Parse the link with the data previously stored
    {
      processHandler({'link': a.href, 'json': waitingItems[a.href].data});          
    }
    return; // don't even call background.html
  }
  
  // Add to the queue
  waitingItems[a.href] = {data: null, WItems: [a]};
  
  // Send a request to fetch data from the background page.
  // Specify that processHandler should be called with the result.
  chrome.extension.sendRequest({action: 'getLink', link: a.href}, processHandler);
}

var checkedLinks = [];

// Will be called for every link in the page
function checkLink(a)
{
  if(checkedLinks.indexOf(a) != -1)
  {
    // Link already checked, stop here
    // Note: I'm considering the href doesn't change, to avoid too much computation and because I'm not listening on such change for all links
    return;
  }
  else
  {
    // Preventing the link to be re-check
    checkedLinks.push(a);
    
    // What about cloned DOM nodes, doH!
    // If a copy of the a node is done before prepareRequest is executed, checkLongURL will prevent the copied item to be processed (when DOMNodeInserted will be fired).
  }
  
  // Get the link domain
  // Careful, maybe the link doesn't begin with 'http://' or 'www' or both...
  // This regex return false if the link is an anchor (href="#...") ; '#' won't match the pattern "[-\w]"
  // This regex return false if the link execute javascript (href="javascript:...") ; ':' won't match the pattern "[-\w]"
  // Nice js regex doc here : http://www.javascriptkit.com/jsref/regexp.shtml
  // Also useful : http://www.regextester.com/
  var regexResult = a.href.match(/^(?:https?:\/\/)?(?:www\.)?((?:[-\w]+\.)+[a-zA-Z]{2,})(\/.+)?/i);
  var domain = false;
  var params = false;
  if(regexResult)
  {
    // domain[0] == a.href ; We just want the domain ; obtained with domain[1] for that regex
    domain = regexResult[1];
    if(regexResult[2])
    {
      params = regexResult[2]; // There is some data (it's not simply the service url)
    }
  }
  
  // Only process links from a different domain and links corresponding to a known url shortener service
  if((domain !== document.location.host) && (typeof(config.known_services[domain]) !== 'undefined') && params)
  {
    var regex = new RegExp(config.known_services[domain]['regex'], 'i'); // Check link URL against domain regex
    if(!config.known_services[domain]['regex'] || a.href.match(regex))
    {
      prepareRequest(a);
    }
  }
}

function start(data)
{
  config = data;
  try
  {   
    if(config.options.showPopup)
    {
      // Create tooltip div (hidden)
      var tooltipWidth = 400;
      tooltip.create(tooltipWidth);
      
      // Give a name to the function for removeEventListener (see later)
      var ondocumentmovemouse = function(e)
      {
        var posx=0;var posy=0;
        var ev=(!e)?window.event:e;//Moz:IE
        if(ev.pageX){posx=ev.pageX;posy=ev.pageY;}//Mozilla or compatible
        else if(ev.clientX){posx=ev.clientX;posy=ev.clientY;}//IE or compatible
        else{return;}//old browsers
        
        if(tooltip.content)
        {
          tooltip.content.style.top = posy+20 + 'px';
          tooltip.content.style.left = posx-tooltipWidth/2 + 'px';
        }
      };
      
      // Set mousemove event for the tooltip
      document.body.addEventListener('mousemove', ondocumentmovemouse, false);
    }

    //------------------------------

    // Listen for DOM modification (ajax request = potential shortened url)
    document.body.addEventListener('DOMNodeInserted', function(e)
    {
      function enqueueCall(node)
      {
        setTimeout(function()
        {
          lookForA(node);
        }, 0); // Non-blocking
      }
      function lookForA(n)
      {
        if(n.nodeName == 'A') // Found a link item (that you can click, not a simple url in the text)
        {
          checkLink(n);
        }
        for(var i = 0, len = n.childNodes.length; i < len; ++i)
        {
          if(n.childNodes[i].nodeType == 1) // ELEMENT_NODE
          {
            // Progressive checking to avoid freeze even with lots of nodes
            enqueueCall(n.childNodes[i]);
          }
        }
      }
      lookForA(e.relatedNode); // Check children recursively
    }, false);

    //------------------------------
    // Note: Script is run at "document_end", see Manifest defintion & documentation: https://developer.chrome.com/dev/extensions/content_scripts.html
    // Therefore, DOM has been loaded when this file is executed

    // !!x is true if x is not zero and false otherwise : forced cast to boolean.
    var isXpathSupported = !!(document.implementation && document.implementation.hasFeature && document.implementation.hasFeature('XPath', '3.0'));
    if(isXpathSupported) // XPath
    {
      var links = document.evaluate('//a[@href]', document, null, XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE, null); // XPath (seems faster)
      for(var i = 0, len = links.snapshotLength; i < len; ++i)
      {
        checkLink(links.snapshotItem(i));
      }
    }
    else // DOM
    {
      var links2 = document.links;
      for(var j = 0, len2 = links2.length; j < len2; ++j)
      {
        checkLink(links2[j]);
      }
    }
  }
  catch(ex)
  {
    console.error(config.options.logHeader + ' ' + ex, ex);
  }
}

function processHandler(backResponse)
{
  var json = backResponse.json;
  var link = backResponse.link;
  
  // Utility function for mouseout listener
  var is_child_of = function(parent, child)
  {
    if(child)
    {     
      while(child.parentNode)
      {
        if((child = child.parentNode) == parent)
        {
          return true;
        }
      }
    }
    return false;
  };
  
  var parseLink = function(a)
  {
    if(typeof(a) != 'object') // asynchronous -> a could have been destroyed ; check if a is still here
    {
      throw new Error('Current element is not and object');
    }

    // Copy the data, first 'if' may change the value ^^
    var tinyurl = a.href,
      options = config.options;
    
    if(options.replaceHref && json['long-url'])
    {
      // Whatever the content of the link is, we change the href attribute
      a.href = json['long-url'];
    }
    
    if(options.replaceVisibleHref > 0)
    {
      var linkText = a.innerText || a.text || a.textContent; // a.innerHTML
      if(tinyurl == linkText || options.forceVisibleHref)
      {
        if(options.replaceVisibleHref == 1 && json['title'])
        {
          a.innerHTML = json['title'];
        }
        else if(json['long-url'])
        {
          a.innerHTML = json['long-url'];
        }
      }
    }
    
    if(options.showPopup)
    {
      a.addEventListener(
        'mouseover',
        function(e)
        {
          tooltip.show(tinyurl);
        },
        false
      );
      a.addEventListener(
        'mouseout',
        function(e)
        {
          // Mouseout is fired when moving to another element, even if the mouse stay inside the <a> :-(
          // We have to check if this event is really a mouseout for our <a> element            
          
          var current_mouse_target = null;
          if(e.toElement)
          {       
            current_mouse_target = e.toElement;
          }
          else if(e.relatedTarget)
          {       
            current_mouse_target = e.relatedTarget;
          }
          
          // Code inside this if is executed when leaving the link and it's children, for good
          if(a != current_mouse_target && !is_child_of(a, current_mouse_target))
          {
            tooltip.hide();
          }
        },
        false
      );
    }
  };
  
  //------- 
  //Syntax: waitingItems[a.href] = {data: null, WItems: []};
  
  try
  {
    waitingItems[link].data = json;
    
    // Loop trough each waiting items for this link
    for(var j = 0, len = waitingItems[link].WItems.length; j < len; ++j)
    {
      // Process waiting item
      parseLink(waitingItems[link].WItems[j]);
      
      // Clear out
      waitingItems[link].WItems[j] = null;
      delete waitingItems[link].WItems[j];
    }
    
    // Final clear out from waiting list
    /* Still need data for tooltip
    waitingItems[link] = null;
    delete waitingItems[link];
    */
  }
  catch(ex)
  {
    console.error(config.options.logHeader + ' ' + ex, ex);
  }
}


// List of processed links for the current page
var waitingItems = {},
  config = {};

// Send a request to fetch data from the background page.
// Specify that start should be called with the result.
chrome.extension.sendRequest({action: 'getOptionsAndServices'}, start);

// ]]>