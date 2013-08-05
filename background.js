/* jshint sub:true */

var LongURL = 
{
  options:
  {
    showPopup: true, // Show a tooltip when the mouse is over the link
    replaceHref: true, // For security and rapidity, true is more than recommended ; Replace the link your browser will hit if you click the link
    replaceVisibleHref: 1, // 0: no, 1: title, 2: link ; default=1 as recommended by W3C : http://www.w3.org/TR/WCAG10-HTML-TECHS/#link-text ; http://www.w3.org/TR/WCAG20-HTML-TECHS/
    forceVisibleHref: false, // Force change of the link text even if it's not the target - Example: <a href="http://is.gd/w">Home page of Google</a>
    logHeader: '[LongURL]'
  },
  
  requests: 0, // Total number of requests to LongURL API
  
  storedRequests: {}, // All resolved links: the cache

  services: {},
  servicesCount: 0,
  
  // Call LongURL webservice and define callback
  prepareRequest: function(link, pageCallback)
  {
    if(LongURL.storedRequests[link])
    {
      // This tinyurl has already been listed, maybe in another page, stop here!
      
      var json = LongURL.storedRequests[link];
      console.log(LongURL.options.logHeader + '[Cache] Send ' + link + ' -> ' + json['long-url']);
      pageCallback({'link': link, 'json':json}); // Send data to content script
      return;
    }
    
    LongURL.storedRequests[link] = null; // Init
    //console.log(LongURL.options.logHeader + ' Getting ' + link);

    var callback = function(json)
    {
      // Store the data
      LongURL.storedRequests[link] = json;
      
      // Analyze result
      LongURL.processRequest(link, pageCallback);
    };
    
    var apiurl = 'http://api.longurl.org/v2/expand?',
      request = 'url=' + encodeURIComponent(link) +
    '&all-redirects=1' +
    '&content-type=1' +
    '&response-code=1' +
    '&title=1' +
    '&rel-canonical=1' +
    '&meta-keywords=1' +
    '&meta-description=1' +
    '&format=json';
    
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(data)
    {
      if(xhr.readyState == 4)
      {
        if(xhr.status == 200)
        {
          try
          {
            callback(JSON.parse(xhr.responseText));
          }
          catch(JSONex)
          {
            console.error(LongURL.options.logHeader + 'JSON error parsing api response for ' + link);
          }
        }
        else
        {
          console.error(LongURL.options.logHeader + ' xhr.status='+xhr.status);
        }
      }
    };
    xhr.open('GET', apiurl + request, true);
    xhr.send();
    
    LongURL.requests++;
  },
  
  // Analyze LongURL result and send data to content script
  processRequest: function(link, pageCallback)
  {
    try
    {
      var json = LongURL.storedRequests[link];      
      if(json['response-code'] != 200)
      {
        if(json['messages'])
        {
          for(var j = 0; j < json['messages'].length; j++)
          {
            console.warn(LongURL.options.logHeader + ' Server Response - ' + json['messages'][j]['type'] + ': ' + json['messages'][j]['message'] + ', for ' + link);
          }
        }
        else
        {
          console.warn(LongURL.options.logHeader + ' Server Response Error ' + json['response-code'] + ', for ' + link);
        }
      }

      console.log(LongURL.options.logHeader + '[Fresh] Got ' + link + ' -> ' + json['long-url']);
      pageCallback({'link': link, 'json':json}); // Send data to content script
    }
    catch(ex)
    {
      console.error(LongURL.options.logHeader + ' ' + ex/*, json*/);
    }
  }
};


//----------
// Get options from local storage if available

function toBool(str)
{
  return 'false' === str ? false : str;
}
if(localStorage['showPopup'])
{
  LongURL.options.showPopup = toBool(localStorage['showPopup']);
}
if(localStorage['replaceHref'])
{
  LongURL.options.replaceHref = toBool(localStorage['replaceHref']);
}
if(localStorage['replaceVisibleHref'])
{
  LongURL.options.replaceVisibleHref = localStorage['replaceVisibleHref'];
}
if(localStorage['forceVisibleHref'])
{
  LongURL.options.forceVisibleHref = toBool(localStorage['forceVisibleHref']);
}

//----------
// Load services list

(function()
{
  // ~340 services
  var servicesUrl = "http://api.longurl.org/v2/services?format=json";
  console.log(LongURL.options.logHeader + ' Fetching services list: ' + servicesUrl);

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function()
  {
    if(xhr.readyState == 4)
    {
      if(xhr.status == 200)
      {
        try
        {
          LongURL.services = JSON.parse(xhr.responseText);

          LongURL.servicesCount = 0;
          for(var service in LongURL.services)
          {
            LongURL.servicesCount++;
          }

          console.log(LongURL.options.logHeader + ' Got ' + LongURL.servicesCount + ' services: ', LongURL.services);
        }
        catch(JSONex)
        {
          console.error(LongURL.options.logHeader + ' JSON error parsing services list');
        }
      }
      else
      {
        console.error(LongURL.options.logHeader + ' xhr.status='+xhr.status);
      }
    }
  };
  xhr.open('GET', servicesUrl, true);
  xhr.send();
})();

//----------

/**
* Handles data sent via chrome.extension.sendRequest().
* @param request Object Data sent in the request.
* @param sender Object Origin of the request.
* @param callback Function The method to call when the request completes.
*/
function onRequest(request, sender, callback)
{
  if(request.action == 'getLink')
  {
    LongURL.prepareRequest(request.link, callback);
  }
  else if(request.action == 'getOptionsAndServices')
  {
    if(LongURL.servicesCount > 0) // Wait that the services list is present
    {
      var obj =
      {
        options: LongURL.options,
        known_services: LongURL.services
      };
      callback(obj);
    }
  }
}

chrome.extension.onRequest.addListener(onRequest); // Wire up the listener