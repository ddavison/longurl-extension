function save_options()
{
  var bgPage = chrome.extension.getBackgroundPage();
  bgPage.LongURL.options.showPopup = document.getElementById('showPopup').checked;
  bgPage.LongURL.options.replaceHref = document.getElementById('replaceHref').checked;  
  var sel = document.getElementById('replaceVisibleHref');
  bgPage.LongURL.options.replaceVisibleHref = sel.options[sel.selectedIndex].value;
  bgPage.LongURL.options.forceVisibleHref = document.getElementById('forceVisibleHref').checked;
  
  localStorage['showPopup']       = bgPage.LongURL.options.showPopup;
  localStorage['replaceHref']     = bgPage.LongURL.options.replaceHref;
  localStorage['replaceVisibleHref']  = bgPage.LongURL.options.replaceVisibleHref;
  localStorage['forceVisibleHref']  = bgPage.LongURL.options.forceVisibleHref;
  
  var status = document.getElementById('status');
  status.innerHTML = 'Options have been saved!<br />Just refresh opened page if any to see changes :)';
  setTimeout(function(){status.innerHTML = '';}, 5000);
}
function load_options()
{
  var bgPage = chrome.extension.getBackgroundPage();
  var opts = bgPage.LongURL.options;
  console.log(opts);
  document.getElementById('showPopup').checked = opts.showPopup;
  document.getElementById('replaceHref').checked = opts.replaceHref;
  var sel = document.getElementById('replaceVisibleHref');
  for(var i=0; i<sel.options.length; i++)
  {
    if(sel.options[i].value == opts.replaceVisibleHref)
    {
      sel.options[i].selected = true;
    }
  }
  document.getElementById('forceVisibleHref').checked = opts.forceVisibleHref;
}
function restore_options()
{
  var bgPage = chrome.extension.getBackgroundPage();
  bgPage.LongURL.options.showPopup = true;
  bgPage.LongURL.options.replaceHref = true;
  bgPage.LongURL.options.replaceVisibleHref = 1;
  bgPage.LongURL.options.forceVisibleHref = false;
  
  localStorage['showPopup']       = bgPage.LongURL.options.showPopup;
  localStorage['replaceHref']     = bgPage.LongURL.options.replaceHref;
  localStorage['replaceVisibleHref']  = bgPage.LongURL.options.replaceVisibleHref;
  localStorage['forceVisibleHref']  = bgPage.LongURL.options.forceVisibleHref;
  load_options(); // Refresh UI
  
  var status = document.getElementById('status');
  status.innerHTML = 'Defaults values have been restored!<br />Just refresh opened page if any to see changes :)';
  setTimeout(function(){status.innerHTML = '';}, 5000);
}

window.addEventListener("load", function()
{
  load_options();
  document.getElementById("save_options").addEventListener("click", save_options);
  document.getElementById("restore_options").addEventListener("click", restore_options);
});