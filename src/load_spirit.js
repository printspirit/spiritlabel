/* 加载JS*/
const loadjs = function(jsfile) {
	return new Promise((resolve, reject)=>{
		const win=window;
		const oHead = win.document.getElementsByTagName('HEAD').item(0);
		const scripts=oHead.getElementsByTagName('script');
		for(var i=0; i<scripts.length; i++){
			if (scripts[i].src===jsfile) {
				resolve();
				return;
			}
		}
		var oScript= win.document.createElement("script");
		oScript.type = "text/javascript";
		oScript.src=jsfile;
		oScript.onload = ()=>{
			resolve();
		}
		oScript.onerror = ()=>{
			reject();
		}
		oHead.appendChild(oScript);
	});
}

function _download(url) {
  const link = document.createElement('a');
  link.style.display = 'none';
  document.body.appendChild(link);
  link.href = url;
  //link.download = 'filename';
  link.click();
  document.body.removeChild(link);
}

export function download() {
  _download("/download/spirit-web-setup.exe")
}

export const load_spirit_js=async(trycnt)=>{
    let p=window.location.protocol
    let timestamp = new Date().getTime();
    var js;
    if (p==='https:') 
        js=`https://127.0.0.1:${trycnt===1?'1':''}9443/js/spirit.js`
    else 
        js=`http://127.0.0.1:${trycnt===1?'1':''}9011/js/spirit.js`
    js += `?t=${timestamp}`
    try {
	    await loadjs(js)
    }catch(e) {
        if (trycnt===0) await load_spirit_js(1);
        if (trycnt===1 && window.location.host!=="www.printspirit.cn") {
	        await loadjs("/js/spirit.js");
        }
    }
}

