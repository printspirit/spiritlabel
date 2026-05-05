import React, { useState, useEffect } from 'react';
import {Button, DivWin as W, Grid as G, InputButton, Toolbar} from 'ecp';
import LabelGallery from './LabelGallery.jsx'
import tp_utils from './tp_utils.js'
import {_} from "./locale.js";

const LOAD_XORKEY=48

function TpVar(props) {
    const {tpid, def_val, name}=props;
    let [val, setVal]=useState("")
    let type=1
    let show_name=name
    let type_name=""
    if (name.startsWith("spirit.serial.")) {
        type=3
        type_name="自增序列"
        show_name = name.substring(14)
    }else if (name.startsWith("spirit.")) {
        type=2
        let now = new Date();
        switch (name.substring(7)) {
        case 'date': 
            type_name = _("预定义变量")
            show_name = _("日期")
            break;
        case 'time': 
            type_name = _("预定义变量")
            show_name = _("时间hh:mm:ss")
            break;
        case 'time_hhmm': 
            type_name = _("预定义变量")
            show_name = _("时间hh:mm")
            break;
        }
    }

    useEffect(() => {
        
        const getVar=async()=>{
            let v = await window.SPIRIT.getSerialVal(tpid, name, def_val)
            setVal(v.data)    
        }
        
        if (type==3) {
             if (typeof window.SPIRIT.getSerialVal !== "function") {
                setVal(_("未安装打印插件,无法获取序列当前值"))
                return
             }
             getVar()
        }else if (type==2) {
            let now = new Date();
            switch (name.substring(7)) {
            case 'date': 
                let yyyy_mm_dd = now.getFullYear() + '-' + (now.getMonth() + 1).toString().padStart(2, '0') + '-' + now.getDate().toString().padStart(2, '0');
                setVal(yyyy_mm_dd)
                break;
            case 'time': 
                let hh_mm_ss = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0') + ':' + now.getSeconds().toString().padStart(2, '0');
                setVal(hh_mm_ss)
                break;
            case 'time_hhmm': 
                let hh_mm = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');  
                setVal(hh_mm)
                break;
            }
        }
    }, [tpid, name])
    
    const setValDlg=async ()=>{
        try {
            let newval = await W.prompt("设置序列初值", val)
            let rc = await window.SPIRIT.setSerialVal(tpid, name, def_val, newval)
            if (rc.data!="OK") {
                W.alert(rc.data)
                return;
            }
            setVal(newval)
        }catch(e) {
            // do noting        
        }
    }
    
    return (
        <tr className="tp-variable">
            <td style={{minWidth:100}}>{show_name}</td>
            <td style={{minWidth:100}}>{type_name}</td>
            { type===1 && <td style={{minWidth:100}}></td>}
            { type===2 && <td style={{minWidth:100}}>{val}</td>}
            { type===3 && <><td style={{minWidth:100}}>{val}</td><td><Button onClick={setValDlg}>设置起始值</Button></td></>}
        </tr>    
    )
}

function Tpinfo(props) {
  const {tpid, tpinfo, onNext, onResel}=props
  const onEdit=()=>{
    window.location.href=`/designer/${tpid}`
  }
  
  return (
	<G.Row>
		<G.Col width="40%" className="tp-img-div">
			<img  className="tp-img-big" alt="tp-img-big" src={`/utils/thumb?id=${tpid}&t=${new Date().getTime()}`}/>
		</G.Col>
		<G.Col width="50%" className="tp-info">
		    <Toolbar>
    		    <Button type="green" onClick={onNext}>{_("下一步")}</Button>
    		    <Button onClick={onEdit}>{_("编辑")}</Button>
    		    <Button onClick={onResel}>{_("重选")}</Button>
    		</Toolbar>
    		<hr/>
			<p><span className="tp-head-item">{_("名称:")}</span>{tpinfo.name} </p>
			<p><span className="tp-head-item">{_("说明:")}</span>{tpinfo.memo} </p>
			<p><span className="tp-head-item">{_("尺寸:")}</span>{tpinfo.width/10}{_("厘米")} X {tpinfo.height/10}{_("厘米")}</p>
			<br/>
			<p className="tp-head-variable">{_("模板变量")}</p>
			<hr/>
			<div className="tp-varialbe-container">
			    <table>
    			    <thead><tr className="tp-variable"><th>{_("变量名")}</th><th>{_("类型")}</th><th>{_("起始值/当前值")}</th></tr></thead>
			        <tbody>{props.tp_vars.map((o,i)=><TpVar key={i} def_val={tpinfo.default_vars[o]} tpid={tpinfo.id || tpid} name={o} />)}</tbody>
			    </table>
			</div>
		</G.Col>
	</G.Row>)
}

class Seltp extends React.Component {
   
    constructor(props) {
		super(props);
		this.state={
			search_key : "",
			owner : "all",
			logged : false,
			sel_win : false, 
			sel_type: ''
		}
    }
    
    componentDidMount=()=>{
    	this.props.setStep("seltp")
		let {id}=this.props.match.params;
		let {tpid}=this.props.tpdata;
		
		if (id && tpid!=id) {
			this.do_seltp(id);
		}else{
    		if (tpid) {
    		    this.setState({tpid, selected:true});
    		}    
		}
    }
    
    loadtp=async(tpid)=>{
        try {
            let rc = await fetch(`/api/load-template-enc?id=${tpid}`)
			    .then((response)=>{
        			return response.arrayBuffer()
			    }).then((buf)=>{
			        let byteArray = new Uint8Array(buf);
			        for (let i = 0; i < byteArray.length; i++) {
                        byteArray[i] ^= LOAD_XORKEY;
                    }
			        return JSON.parse(new TextDecoder().decode(byteArray))
			    })
			let tp_vars=tp_utils.get_vars(rc.data);
		    this.props.onChangeTp({tpid, tpinfo:rc.tpinfo, tp_vars});
		}catch(e){
		    console.log(e)
		}
    }
    
    nextStep=()=>{
		const {tpdata}=this.props;
    	const {tpinfo, tp_vars}=tpdata;
    	
    	if (!window.SPIRIT) {
        	W.alert(_("请先安装打印插件"));
    		return;
    	}
    	
    	if (!tpinfo) {
    		W.alert(_("请先选择打印模版"));
    		return;
    	}
    	if (!tp_vars || tp_vars.length===0) {
			
    		W.confirm(_("模版没有需要绑定的变量!"), 
    			()=>this.props.history.push("/print-tools/doprint")
    		)
    	}else if (tp_utils.get_var_cnt(tp_vars)===0) {
			this.props.history.push("/print-tools/doprint")
		}else{
	    	this.props.history.push("/print-tools/loaddata");
	    }
    }
    
    do_seltp=async (tpid)=>{
    	this.loadtp(tpid);
    	this.setState({tpid, selected:true});
    }
    
    edit=(record)=>{
    	window.location.href=`/designer/${record.id}`;
    }
    
    dosearch=(search_key)=>{
    	this.setState({search_key})
    }
    
    onChgOwner=(owner)=>{
    	this.setState({owner});
    }
    
    useShares = ()=>{
        this.setState({sel_win:true, sel_type:'shares'});
    }
    
    useMine = ()=>{
        console.log("use mine")
        let {Userinfo, login}=this.props
        if (Userinfo) {
            this.setState({sel_win:true, sel_type:'mine'});
        }else{
            login(()=>{
                this.setState({sel_win:true, sel_type:'mine'});
            })
        }
    }
    
    useLocal = () =>{
       W.alert(_("该功能暂未实现"))
    }
    
    returnIndex=()=>{
        this.setState({sel_win:false, selected:false});   
    }
    
    reSel=()=>{
        this.setState({selected:false});   
    }
	
	create=()=>{
		window.open(`/designer`, "_blank")
	}
    
    render() { 
    	const {search_key, selected, sel_win, sel_type, tpid}=this.state;
    	const {tpdata}=this.props;
    	const {tpinfo, tp_vars}=tpdata;
		const is_local = window.SPIRIT?(window.SPIRIT.type==="desktop" || window.SPIRIT.type==="center"):false
    	return (
		<>
		{ selected ? (tpinfo && <Tpinfo tpid={tpid} tpinfo={tpinfo} tp_vars={tp_vars} onNext={this.nextStep} onResel={this.reSel}/>):
		    (
		        sel_win || is_local?
		        <div className="sel-tp-win">
    		        <G.Row>
	        			<G.Col style={{margin:"0 auto", padding:10, paddingBottom:20}}>
	        				<InputButton no_empty={false} defaultValue={search_key} onClick={this.dosearch} style={{display:'inline'}}>{_("搜索")}</InputButton>
	        				<Button onClick={this.returnIndex}>{_("返回")}</Button>
	        			</G.Col>
	        		</G.Row> 
	        		<div>
		                {sel_type==='shares' && <LabelGallery key={'label-shares'} type="shares" search={search_key} onSelTp={this.do_seltp}/> }
				        { sel_type==='mine' && <LabelGallery key={'label-mine'} type="mine" search={search_key} onSelTp={this.do_seltp} login={this.props.login} /> }
				        { is_local && <LabelGallery key={'label-mine'} type="mine" search={search_key} onSelTp={this.do_seltp} /> }
            		</div>
                </div>
                :
		        <div>
    		        <div className="lpts-intro">
					    {_("LPTS介绍")}
				    </div>
					<div className="sel-tp-index">
					    
						<div onClick={this.useShares}>
							<div className="sel-tp sel-tp-yun"/>
							<div className="sel-tp-title">{_("共享云标签")}</div>
						</div>
						<div onClick={this.useMine}>
							<div className="sel-tp sel-tp-mine"/>
							<div className="sel-tp-title">{_("我的标签")}</div>
						</div>
						<div onClick={this.create}>
							<div className="sel-tp sel-tp-local"/>
							<div className="sel-tp-title">{_("新建标签")}</div>
						</div>
					</div>
					<div style={{textAlign:'center'}}>
						<a href="https://www.github.com/printspirit/lpts">{_("该项目已在GitHub上开源")}</a>
					</div>
				</div>
		    )
		}
		</>
    	);
    }
}

export default Seltp
