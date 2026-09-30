// Direct links still work; the parent keeps the conversation alive during navigation.
if(window.top===window.self){location.replace('/index.html#omgeving/'+encodeURIComponent(location.hash.slice(1)||'start'));}
