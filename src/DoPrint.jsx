import React from 'react';
import {H1, Grid as G, Button, DivWin as W, Form, Error,} from 'ecp';
import {_} from "./locale.js";
import tp_utils from './tp_utils.js'

// 将独立的ns1.ns2...key1变量按ns组合起来：
// 如：{ns1.key1:v1, ns1.key2:v2} => {ns1:{key1:v1, key2:v2}}
function merge_var(row) {
    let r={}
	let keys=Object.keys(row);
	keys.forEach((varname)=>{
		let ns = varname.split('.');
		let vp = r;
		for (let i=0;i< ns.length - 1; i++) {
			if (!(ns[i] in vp)) vp[ns[i]]={};
				vp=vp[ns[i]];
			}	
		vp[ns[ns.length -1]]=row[varname];
	})
	return r;
}

class DoPrint extends React.Component {

	/* 状态 */
	state={
		prnlst : [],     /* 全部可用打印机 */ 
		cur_prnlst : [], /* 当前类型可用打印机*/
		info: null 
	}
	
	constructor(props) {
		super(props);
		props.setStep("doprint")
		if (!props.tpdata.tpid) this.props.history.push("/print-tools/seltp")
	}

	nextStep=()=>{
	    let {info}=this.state; 
		let {print_opts}=this.props;		
		let {name}=print_opts;
		this.props.history.push({ 
	        pathname: "/print-tools/finish",
	        state: { printer: name, dir: info.output_dir }
	    });
	}
	
	prevStep=()=>{
		let {tpid, tp_vars}=this.props.tpdata;
		if (!tpid || tp_utils.get_var_cnt(tp_vars)===0 ) this.props.history.push("/print-tools/seltp")
		else this.props.history.push("/print-tools/loaddata")
	}
		
	print=()=>{
		let {tpdata, data, print_opts}=this.props;
		let {copys}=print_opts;
		if (data.length===0 && copys===0) {
		    W.alert(_("请设置打印数量"));
		    return;
		}
		
		if (!window.SPIRIT) {
			W.alert(_("打印机未准备就绪!"));
			return;
		}
		
		let cnt = tp_utils.get_var_cnt(tpdata.tp_vars)
		
		var getVars=(idx)=>{
			if (idx>0) return null;
			if (cnt===0) {
				return {}
			}else{
				return merge_var(data[0]);
			}
		}
		
		this.doPrint(tpdata.tpid, getVars);
	}
	
	setTemplateUrl=()=>{
		let {protocol, host}=window.location
		window.SPIRIT.setUrl(`${protocol}//${host}/api/load-template?id=`)
	}
		
	printAll=()=>{
		let {tpdata, data, sql, print_opts}=this.props;
		let {copys}=print_opts;
		if (data.length===0 && copys===0) {
		    W.alert(_("请设置打印数量"));
		    return;
		}
				
		if (!window.SPIRIT) {
			W.alert(_("打印机未准备就绪!\n请检查是否未安装\"打印精灵\""));
			return;
		}
		
		if (sql) {
			return this.printBySql(sql, tpdata.tpid, this.nextStep)
		}
				
		var getVars=(idx)=>{
			if (tp_utils.get_var_cnt(tpdata.tp_vars)===0) {
				/* 非变量模式，按打印份数打印*/
				if (idx>=copys) return null;
				else return {}
			}else{
				/* 变量模式，按数据行数打印*/
				if (idx>=data.length) return null;
				return merge_var(data[idx]);
			}
		}
		
		this.doPrint(tpdata.tpid, getVars, this.nextStep);
	}	
	
	/* 执行打印 */
	doPrint=async(tpid, getVars, finish)=>{
		
		let {info}=this.state; 
		let {print_opts}=this.props;		
		let {type, name, size, print_dir, fill, col, row, gapX, gapY, quality}=print_opts;
		if (!name) {
			W.alert(_("没有该类型的打印机！"));
			return;
		}
		let opt={type, name, size, print_dir, fill, col, row, gapX:Math.floor(gapX*10), gapY:Math.floor(gapY*10), quality}
		
		if (size==='auto') {
			const {width, height} = this.props.tpdata.tpinfo
			
			if (fill==='2') {
				W.alert(_("使用标签尺寸不能自动拼版！"));
				return
			}
			if (col==='auto') col=1
			if (row==='auto') row=1
						
			if (print_dir==='1' || print_dir==='3') {
    			size = [height*row + 10*gapY*row, width*col + 10*gapX*col]
			}else{
    			size = [width*col + 10*gapX*col, height*row + 10*gapY*row]
			}
			
			opt.size=size;
		}else if (typeof info.paper[size] === "object" ) {
		    let {w, h, cols, marginLeft, marginTop, marginRight, marginBottom}=info.paper[size]
		    marginBottom = marginBottom || marginTop
		    marginRight = marginRight || marginLeft
			    
		    if (cols) {
				size = [w, h]
				opt.size=size;
				opt.marginLeft=marginLeft
				opt.marginTop=marginTop
				opt.marginRight=marginRight
				opt.marginBottom=marginBottom
			}
		}    
		
		var page;
	    var cancel_print=false;
		var p;
		
		this.setTemplateUrl()		
		try {
		    p=await window.SPIRIT.open(opt)
	    }catch(e){
	        W.alert(e);
	        return;
	    }
	
		let w=W.show(
			<W.Dialog title={_("打印中")} height="400" onClose={e=>{cancel_print=true; return true}}>
				<G.Row className="print-dlg">
					<G.Col style={{margin:"0 auto", width:380, textAlign:"center"}}>
						<H1 >{_("正在打印第")}<span ref={e=>page=e} ></span>{_("张标签")}</H1>
						<img src="printing.jpg" alt="printing" height="260px"/>
						<p className="center"><Button type="blue" onClick={e=>cancel_print=true}>{_("取消")}</Button></p>
					</G.Col>
				</G.Row>
			</W.Dialog>
		);
		
		let i=0;
		let printed=1;	
		let running=true			
		while(running) {
		    let vars=getVars(i);
		    if (vars===null) {
                p.close();
                w.close();
                if (finish) finish()
		        break;
			}
		    
		    let copies = 1
		    if ('$copies' in vars) {
		    	copies=parseInt(vars['$copies'])||1
		    	delete vars['$copies']
		    }
		    
		    for (let n=0; n<copies; n++) {
		    
		    	if (page) page.innerHTML=printed;
		    
				try {
					await p.PrintLabel(tpid, vars);
				}catch(e){
					p.close();
		            w.close();
		            W.alert(e);
		            break;
				}
				//await timewait();
				if (cancel_print===true) {
					p.close();
		            w.close();
		            W.alert("用户中断");
		            running=false
					break;
				}
				printed++
			}	
			i++;
		}
	}
	
	printBySql=async(sql, tpid, finish)=>{
		var page;
		var progress;
		var jobid;
		
		let {info}=this.state; 
		let {print_opts}=this.props;		
		let {type, name, size, fill, col, row, gapX, gapY, quality}=print_opts;
		if (!name) {
			W.alert(_("没有该类型的打印机！"));
			return;
		}
		let opt={type, name, size, fill, col, row, gapX:Math.floor(gapX*10), gapY:Math.floor(gapY*10), quality}
		
		if (size==='auto') {
			const {width, height} = this.props.tpdata.tpinfo
			if (fill==='3') {
				W.alert(_("使用标签尺寸不能自动拼版！"));
				return
			}
			if (col==='auto') col=1
			if (row==='auto') row=1
			
			size = [width*col + 10*gapX*col, height*row + 10*gapY*row]
			opt.size=size;
		}else if (typeof info.paper[size] === "object" ) {
		
		    let {w, h, cols, marginLeft, marginTop, marginRight, marginBottom}=info.paper[size]
		    marginBottom = marginBottom || marginTop
		    marginRight = marginRight || marginLeft
		
		    if (cols) {
				size = [w, h]
				opt.size=size;
				opt.marginLeft=marginLeft
				opt.marginTop=marginTop
				opt.marginRight=marginRight
				opt.marginBottom=marginBottom
			}
		}
		
		this.setTemplateUrl()
		
		try {
		    var prnInst = await window.SPIRIT.open(opt)
    		try {
    		    let {data}=await prnInst.PrintLabelSql(tpid, sql);
        		jobid=data.id;
        		if (window.SPIRIT.type!=="desktop") prnInst.close();
        	}catch(e){
        	    prnInst.close()
	            W.alert(e);
	            return;
	        }
	    }catch(e){
	        W.alert(e);
	        return;
	    }
	    
	    var w;
	    const stop_print=async(e)=>{
	        let rc= await window.SPIRIT.Stop(jobid)
	        if (window.SPIRIT.type==="desktop") prnInst.close();
			w.close()
			
			if (rc.msg!=="") {
			   W.alert(rc.msg);
			}
    		if (finish) finish()
	    }
	    	
		w=W.show(
			<W.Dialog title={_("打印中")} height="400">
				<G.Row className="print-dlg">
					<G.Col style={{margin:"0 auto", width:380, textAlign:"center"}}>
						<H1><small>{_("正在打印第")}<span ref={e=>page=e} ></span>{_("张标签")}</small></H1>
						<div className="progress">
						    <div ref={e=>progress=e} style={{width:1}}/>
						</div>
						<img src="printing.jpg" alt="printing" height="260px"/>
						<p className="center"><Button type="blue" onClick={stop_print}>{_("取消")}</Button></p>
					</G.Col>
				</G.Row>
			</W.Dialog>
		);
		
		window.SPIRIT.JobEvent(jobid
		    , (rc)=>{
		        let {data} = rc;
		        let {total, cur}=data;
		        
		        if (total!==0 && total===cur) {
			        w.close();
			        if (window.SPIRIT.type==="desktop") prnInst.close()
			        if (finish) finish()
			    }
		        
			    if (page) page.innerHTML=cur;
			    if (progress) progress.style=`width:${cur*100/total}%`;
		    }
		    , (rc)=>{
                w.close();
                if (window.SPIRIT.type==="desktop") prnInst.close();
                W.alert(_("错误:"+rc));
		    }
        )	
	}
	
	getPaperList=(info)=>{
	    return Object
	    .keys(info.paper||{})
	    .reduce(
			(a,p)=>{a[p]=info.paper[p].name; return a}, 
			{"auto":_('标签大小'), 0:_('打印机缺省')}
		)
	}
	
	getPrinterInfo=(name)=>{
		window.SPIRIT.getPrinterInfo(name).then(({data})=>{
			this.setState({info:data})
		}).catch(()=>{
			this.setState({spirit_ok:false})
		})
	}
	
	getPrinterByType=(type, prnlst)=>{
	    if (!prnlst) prnlst=this.state.prnlst
		if (type==='auto') {
			return prnlst.filter(o=>o.act===true).map(o=>o.name)
		}else{
			return prnlst.filter(o=>o.type===type).map(o=>o.name)
		}
	}

	onDataChange=(values, id, val)=>{
	
		let {info}=this.state;
	
		if (id==='type') {
			if (val==='ZPL') {
				values['col']='1';
				values['row']='1';
			}else{
				values['col']='auto';
				values['row']='auto';
			}
			let cur_prnlst=this.getPrinterByType(val)
			if (cur_prnlst.length>0) this.getPrinterInfo(cur_prnlst[0]);
			else {
				this.setState({info:null});
			}
			
			this.setState({cur_prnlst});
			this.props.onChangePrintOpts(values);
			return;
		}
		
		if (id==='size') {
		    if (val==='auto') {
		        values['col']='auto'
   				values['row']='auto';    
    			values['gapX']=2.1
    			values['gapY']=2.1;    
    			values['fill']=0;
		    }else{
		        if (typeof info.paper[val] === "object" ) {
    		        let {cols, rows, gapX, gapY}=info.paper[val]
					if (cols) {
						values['col']=cols
						values['row']=rows;    
						values['gapX']=gapX/10;
						values['gapY']=gapY/10;
						values['fill']=2;
					}else{
						values['col']='auto'
						values['row']='auto';    
						values['gapX']=2.1
						values['gapY']=2.1;    
						values['fill']=0;
					}
				}
    	    }
    	    this.props.onChangePrintOpts(values);
   		    return;    
		}
		
		if (id==='name') {
			this.getPrinterInfo(val);
		}
		
		this.props.onChangePrintOpts(values);
	}
	
 	async componentDidMount () {
	 	let {print_opts}=this.props;
	 	let {type, name}=print_opts;
	 	
		try {
			
			let rc = await window.SPIRIT.getPrinterList();
			let prnlst=rc.data
			let cur_prnlst=this.getPrinterByType(type, prnlst)
			if (name && cur_prnlst.indexOf(name)>=0) {
                this.getPrinterInfo(name);
            }else{
                if (cur_prnlst.length>0) this.getPrinterInfo(cur_prnlst[0]);
            }
			
			this.setState({spirit_ok:true, prnlst, cur_prnlst});
			
		}catch(e){
			this.setState({spirit_ok:false});
		}
	}
	
	render() { 
		
		const {tpdata, data} = this.props
		let var_cnt = tp_utils.get_var_cnt(tpdata.tp_vars)
		//let copys = var_cnt===0?1:
		
		const fields=[
			{name:_('打印机类型'),    id:'type',  type:'select', options:{
			        'auto':_('自动选择'),
			        'WIN':_('Windows打印机'), 
			        'ZPL':_('斑马兼容ZPL标签打印机'),
			        'CPCL':_('CPCL便携式标签打印机'),
			        'TSPL':_('TSC兼容标签打印机'),
			        'ESCPOS':_('ESC/POS兼容小票打印机'),
			    }, 
			    def:'auto'
			},
			{name:_('打印机'),       id:'name',   type:'select', options:[] },
			{name:_('纸张'),         id:'size',   type:'select', options:{} , def:"auto" },
			{name:_('标签方向'),     id:'print_dir',    type:'select', options:{'0':_('正常'), '1':_('旋转90度'), '2':_('旋转180度'), '3':_('旋转270度')}, def:'0'},
			{name:_('缩放'),         id:'fill',   type:'select', options:{}, def:'0'},
			{name:_('打印质量'),     id:'quality',type:'select', options:{'0':_('高速'), '1':_('平衡'), '2':_('高质量')}, def:'2'},
			{name:_('每行标签列数'), id:'col',    type:'select', options:{'auto':_('自动'), '1':1, 2:2, 3:3, 4:4, 5:5, 6:6,7:7,8:8,9:9,10:10}, def:'auto'},
			{name:_('列间隙'),       id:'gapX',   type:'number', def:2.1},
			{name:_('每页标签行数'), id:'row',   type:'select', options:{'auto':_('自动'), '1':1, 2:2, 3:3, 4:4, 5:5, 6:6,7:7,8:8,9:9,10:10}, def:'auto'},
			{name:_('行间隙'),       id:'gapY',   type:'number', def:2.1},
			{name:_('标签份数'),     id:'copys',  type:'int', def:1},
			
		];
	
		const {spirit_ok, cur_prnlst, info}=this.state;
		const {print_opts}=this.props;
		
		if (cur_prnlst.length>0) {
			if (!print_opts['name']) print_opts['name']=cur_prnlst[0];
		}else{
			//print_opts['name']="";
		}
		
		let cols=[...fields];
		
		cols[1].options=cur_prnlst;
		if (info) cols[2].options=this.getPaperList(info)
		else cols[2].options={"auto":_('标签大小'), 0:_('打印机缺省')}
		
		if (print_opts['size']==='auto') {
			cols[4].options={'0':_('无缩放')}
			print_opts['fill']='0';
		}else{
			cols[4].options={'0':_('无缩放'), '1':_('适应纸张'), '2':_('适应纸张(等比例)'),'3':_('自动拼版')}
		}
				
		if (tpdata.tp_vars && var_cnt>0) {
			/* 有变量模板，不能打印多张 */
			var disable=['copys'];
			this.props.print_opts['copys']=data.map(o=>(parseInt(o["$copies"] || 1) || 1)).reduce((acc, curr) => acc + curr, 0);;
		}
		
		return (
			<>
				<G.Row>
					<G.Col className="center-layout" width={'60%'}>
						{spirit_ok===false && <Error small>{_("未检测到打印控件！打印精灵未安装？")} <Button type="blue" href="https://www.printspirit.cn/download/spirit-web-setup.exe">{_("立即安装")}</Button></Error>}
						
                    <Form  fields={cols}  nCol={2} readOnlyFields={disable}
                                values={this.props.print_opts}
						        onChange={this.onDataChange}
						        ref={ref=>this.form=ref} />
                    </G.Col>
                </G.Row>
			
				<div className="center">
					<Button type="green" onClick={this.print}>{_("打印首张")}</Button>
					<Button type="green" onClick={this.printAll}>{_("打印全部")}</Button>
					<Button onClick={this.prevStep}>{_("上一步")}</Button>
				</div>
			</>
		);
	}
    
}

export default DoPrint
