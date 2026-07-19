/*窗口程序 modify from GAF - ui divwin.js for React */
/*请参考元gaf.js */
import { appendClass, removeClass, fDragging } from './utils.js'
import css from './divwin.module.css'

var skin_padding={
	'white_big':{'default':{header:24, footer:21}, 'mini':{header:-3, footer:7}},
	'white_small':{'default':{header:-3, footer:7}}
};

var divWin=function(myobj, param) {
	var title= param.title;
	var left = param.left||-1;
	var top  = param.top||-1;
	var width  = param.width;
	var height = param.height;
	var skin  = param.skin;
	var style = param.style || '';
	var modal = param.modal;
	var atTop = param.atTop; 
	var targetWin=param.targetWin;
	this.isOld = false;
	
	if (typeof modal=='undefined') modal=true;
	this.modal=modal;
	
	if (typeof atTop=='undefined') atTop=true;
	this.atTop=atTop;
		
	var st,w,h;
	var dw, topWin;
	
	topWin=window;
	while ( topWin.parent.parent!==topWin.parent && 
			!(topWin.frameElement && topWin.frameElement.tagName==="FRAME")
	) {
		topWin=topWin.parent;  
	}
	if (this.atTop && !(topWin.frameElement && topWin.frameElement.tagName==="FRAME")) topWin=topWin.parent;
  
	if (targetWin) this.topWin=targetWin;
	else this.topWin=topWin;
	this.orginWin=window;
	
	this.$=function(id){ return this.topWin.document.getElementById(id); };
	
	if (!skin || skin==='default') {
		/*向上查找，获取skin*/
		/* FIXME: this is only used under ECP */
		var win=topWin.parent;
		if (typeof win.Main!='undefined' && win.Main.skin) skin=win.Main.skin;
		else skin='default';
	}	
	
	this.skin_padding_header=0;
	this.skin_padding_footer=0;
	
	//this.loadcss('/gaf/skin/divwin/'+skin+'/divwin.css');
	if (skin_padding[skin]) {
		var padding;
		if (skin_padding[skin][style]) padding=skin_padding[skin][style];
		else padding=skin_padding[skin]['default'];
		this.skin_padding_header=padding.header;
		this.skin_padding_footer=padding.footer;
	}
		
	if (this.$(myobj)) {
		this.$(myobj+"-close-btn").onclick.call(window);
	}
	
	if (!width)	width="400px";
	else width=parseInt(width)+"px";
	if (!height) height="300px";
	else height=parseInt(height) + "px";
	
	height=parseInt(height) + this.skin_padding_header + this.skin_padding_footer +"px";
	
	if (left===-1) left=(this.topWin.innerWidth - parseInt(width))/2+"px";
	if (top===-1)  top=((this.topWin.innerHeight - parseInt(height))/2-(this.atTop?0:20))+"px";  
			
	this.oldtop=top;
	
	let offset_y=0; //this.topWin.document.documentElement.scrollTop;
	//let offset_x=0; //this.topWin.document.documentElement.scrollleft;
	
	top=parseInt(top)+offset_y+"px";
	
	h=parseInt(height) - 29 - this.skin_padding_header;
	w=parseInt(width)-2;

	this.myobj = myobj;
	this.showMask();
	
	dw=this.topWin.document.createElement("div");
	dw.id=myobj;
	dw.className=css.dialog+ " "+style;
	dw.style.top=top;
	dw.style.left=left;
	dw.style.width=width;
	dw.style.height=height;
	dw.style.position="fixed";
	this.topWin.document.body.appendChild(dw);
	
	st=`
<div  id="${myobj}-title" class="${css.title}">
    <span>${title}</span>
    <a id="${myobj}-close-btn" href="#" class="${css.btn_close}"></a>
    <div style="clear:both"></div>
</div>
<div id="${myobj}-body" class="${css.cont}" style="height:${h}px;width:${width}">
</div>`;

	dw.innerHTML=st;
	
	/* */
	
	this.obj=myobj;
	this.dw=dw;
	this.body=this.$(myobj+"-body");
	this.loading=false;
	this.hidden=false;
	this.bodyHeight=h;
	this.bodyWidth=w;
	this.dragable=true;
	var self=this;
	this.$(myobj+"-close-btn").onclick = function() { self.close(); return false;}
	this.$(myobj+"-title").onmousedown = this.drag.bind(this);
}

divWin.prototype.showMask=function() {
	if (!this.modal) {
		return;
	}
	
	if (!this.$('dialog-mask')) {
		let dw_mask=this.topWin.document.createElement("div");
		dw_mask.id="dialog-mask";
		dw_mask.className=css["dialog-mask"];
		
		//dw_mask.style.top=this.topWin.document.documentElement.scrollTop+'px';
		/*dw_mask.style.top=0;
		dw_mask.style.left=0;
		dw_mask.style.width=this.topWin.document.body.offsetWidth+'px';
		dw_mask.style.height=this.topWin.document.body.offsetHeight+'px';
		dw_mask.style.position="absolute";*/
		//dw_mask.innerHTML='<iframe width="100%" height="100%" frameborder="0"></iframe><div class="bg"></div>';
		this.topWin.document.body.appendChild(dw_mask);
		this.dw_mask=dw_mask;
		
		appendClass(this.topWin.document.body, 'dialog-masked');
	}
}

divWin.prototype.drag=function(evt) {
	if (!this.dragable) return;
	
	var drag_mask=this.topWin.document.createElement("div");
	drag_mask.style.top=0;
	drag_mask.style.left=0;
	drag_mask.style.width='100%';
	drag_mask.style.height='100%';
	drag_mask.style.position="absolute"
	this.topWin.document.body.appendChild(drag_mask);
	
	let mobj=this.dw;
	fDragging(mobj, evt, false, function(ev) {
			this.topWin.document.body.removeChild(drag_mask);
	}.bind(this));
}

divWin.prototype.resize=function(w,h) {
	this.body.style.width=w+'px';
	this.body.style.height=h+'px';
}

divWin.prototype.move=function(x, y) {
	this.dw.style.top=x+(x!==0?'px':'');
	this.dw.style.left=y+(y!==0?'px':'');
}

divWin.prototype.setDragable=function(dragable) {
	this.dragable=dragable;
}

divWin.prototype.close=function(force) {
	if(!force && typeof this.onClose=="function" && !this.onClose()) return false;
	this.hidden=true;
	try {
		if (this.modal && this.dw_mask) {
			this.topWin.document.body.removeChild(this.dw_mask); 
			this.dw_mask=false;
			removeClass(this.topWin.document.body, 'dialog-masked');
		}
		this.topWin.document.body.removeChild(this.dw);
	}catch(e) {console.log('Warning: close '+this.dw + ', but it is not exists');}
	return true;
}

export default divWin;
