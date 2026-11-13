'use strict';
// Runs before any defer/module script can remove an RSVP-management fragment.
// Retain only a boolean, never the fragment, URL, token, or query string.
(() => {
  let excluded=true;
  try{excluded=window.location.hash.startsWith('#rsvp=');}catch{}
  Object.defineProperty(window,'__DANWHI_ANALYTICS_MANAGEMENT_ENTRY__',{value:excluded,writable:false,configurable:false});
})();
