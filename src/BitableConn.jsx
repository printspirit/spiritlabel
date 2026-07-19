import React from 'react';
import {Page, H4, Button, ConfirmButton, DivWin as W, Toolbar, Form, Tabs, Select, Error} from 'ecp';
import {classNames} from 'ecp';
import {_} from "./locale.js";

var COPIES_COL_NAME = _("$打印份数")

function FieldMap(props){
	let {fields, fmap, tp_vars, onSetFieldMap}=props
	return(
	<div style={{margin:5}}>
		<table>
			<thead>
				<tr><th style={{textAlign:"left"}}>{_("标签变量")}</th><th style={{textAlign:"left"}}>{_("表字段")}</th></tr>
			</thead>
			<tbody>	
			{[...tp_vars, COPIES_COL_NAME].map((v,idx)=>(
				<tr>
					<td style={{paddingRight:5, textAlign:"center"}}>{v}</td>
					<td>
						<Select value={(fmap||{})[v]||""} onChange={f=>onSetFieldMap(v,f.target.value)}>
							<option value=""/>
							{(fields||[]).map((f,i)=><option key={i}>{f.Name}</option>)}
						</Select>
					</td>	
				</tr>
				))
			}
			</tbody>
		</table>
	</div>
	)
}

function Filter(props){
	const {value, onSetFilter}=props
	return (
		<div style={{ position: 'relative', width: '100%' }}>
			<textarea 
				style={{boxSizing:"border-box", width:"100%", height:"400px", resize:"none", border:"1px solid #ccc", padding:"5px"}}
				value={value}
				onChange={onSetFilter}
				/>
			{!value && (
				<div
				  style={{
				    position: 'absolute',
				    top: '5px',
				    left: '5px',
				    color: '#999',
				    fontSize: '14px',
				    lineHeight: '1.6',
				    pointerEvents: 'none', // 关键：让点击穿透
				    fontFamily: 'inherit',
				  }}
				>
				  请输入过滤条件， 如： 物流状态 = "已通过，转运营"
				  <br />
				  也可用AND(条件1, 条件2,...), OR(条件1, 条件，...)组合使用。如：
				  <br />
				  AND(金额 >= 2000, 类别 != "FZ服装")
				  <br/>
				  OR(金额 = 32.9, 金额 = 2000)
				  <br/>
				  AND(金额 >= 2000, 星期 contains "三")
				</div>
			  )}	
		</div>)			  
}

class NewBitable extends React.Component {
    state={
		bitable_cfg : {}
    }
	
	close=()=>{
	    this.props.dialog.close();
	}
	
	onDataChange=(value)=>{
		this.setState({bitable_cfg:value})
	}
	
	getValues=()=>{
		return this.state.bitable_cfg
	}
		
    render() {
    
        let header=[
            {name:_('连接名'),     id:'name',  require:true, style:{width:"100%"}},
	        {name:_('类型'), id:'type',  type:'select', require:true, def:'feishu',
	            options:{'feishu':'飞书', 'wps':'WPS'}, style:{width:"100%"}},
	        {name:_('Appid'),       id:'appid', require:true, type:'password', style:{width:"100%"}},
	        {name:_('Secret'),      id:'secret', require:true, type:'password', style:{width:"100%"} },
	        {name:_('URL'),         id:'url', require:true, style:{width:"100%"}},
	    ];
	    
	    const {bitable_cfg}=this.state
		
		const {dialog} = this.props;
		dialog.form=this;
		
		let disable_fields=[]
		       
        return (
            <Form  fields={header}  nCol={1} disable_fields={disable_fields}
                   values={bitable_cfg}
			       onChange={this.onDataChange}
			       ref={ref=>dialog.gform=ref} />
	    )
    }
}

class BitableConn extends React.Component {
    state={
        src_list : [],
        src_idx  : -1,
        cur_tab : "fieldmap"
    }
	
	componentDidMount=async ()=>{
		let {rc, list} = await window.SPIRIT.bitable.list()
		if (rc==="ERR") {
			return;
		}
    	this.setState({src_list:list})
    }
    
	setData=async ()=>{
	    if (!window.SPIRIT) {
	        W.alert(_("请先安装打印插件"));
   		    return;
	    }
	    
	    
	    
        let {id, fieldmap, filter}=this.state
        let {tp_vars}=this.props;
        
        const validKeys = new Set(tp_vars);
        fieldmap= Object.fromEntries(
        	Object.entries(fieldmap).filter(([key]) => (validKeys.has(key) || key===COPIES_COL_NAME))
		);
         
        let dlg = W.show(
		  <W.Dialog
		  	title=" "
		    width="200"
		    height="100"
		    >
		    {_("数据加载中")}
		  </W.Dialog>
		);
		//this.setState({loadding:true})
        let rc = await window.SPIRIT.bitable.get_records({id, fieldmap, filter});
        //this.setState({loadding:false})		
        dlg.close()
        
		if (rc.rc==='ERR') {
			W.alert(rc.msg);
			return;
		}
		
		rc=await this.props.setData(rc.data)
		if (rc) {
		    this.props.dialog.close();
		}
	}
	
	close=()=>{
	    this.props.dialog.close();
	}
	
	sel=i=>()=>{
		const {src_list, src_idx}=this.state
		if (src_idx!=-1) {
			src_list[src_idx].fieldmap=this.state.fieldmap
			src_list[src_idx].filter=this.state.filter
		}
		const {id, fields, fieldmap, filter}=src_list[i]
		this.setState({id, fields, fieldmap, filter, src_idx:i})
	}
		
	//创建心的数据源
	newSrc=()=>{
	
		const onSubmit=async (form, bitable_cfg)=>{
			let info = await window.SPIRIT.bitable.new(bitable_cfg);
			if (info.rc==="ERR") {
				W.alert(info.msg)
				return;
			}
			
			form.close();
			
			let {src_list}=this.state;
			const {id, fields, fieldmap, filter}=info.cfg
			this.setState({src_list: [info.cfg, ...src_list], src_idx:0, id, fields, fieldmap, filter})
			
			// save it
		}
		
		W.show(
		  <W.Form
		    title={_("新建多维表格数据源1")}
		    width="380"
		    height="300"
		    btn_CANCEL
		    onSubmit={onSubmit}
		    >
		    <NewBitable/>
		  </W.Form>
		);
	}
	
	del=(sql_id)=>async()=>{
        let {rc, msg, list} = await window.SPIRIT.bitable.del(sql_id);
		if (rc==="ERR") {
			W.alert(msg)
	    	return
	    }
	    this.setState({src_list:list, src_idx:-1})	
    }
	
	saveSrc=async()=>{
    }
    
    show_help=()=>{
        let url = "https://www.printspirit.cn/doc/label_print.md#use_db"
        if (window.SPIRIT.type==="desktop") {
            window.runtime.BrowserOpenURL(url);
        }else{
            window.open(url, "_blank");
        }    
    } 
    
    onSetFieldMap=(v, f)=>{
    	let {fieldmap}=this.state
    	fieldmap={...fieldmap, [v]:f}
    	this.setState({fieldmap})
    }
    
    onSetFilter=(e)=>{
    	this.setState({filter:e.target.value})
    }
    
    render() {
    
        const {src_list, src_idx, id, fields, fieldmap,  filter, cur_tab, loadding}=this.state;
		const {dialog, tp_vars} = this.props;
		dialog.form=this;
		
		let disable_fields=[]
		       
        return (
            <div  className="sql-conn-panel">
                <div className="left">
				    { src_list.length===0 ?
					    <div>
						    <div className="center mt10">{_("创建飞书、WPS等多维表格数据源")}</div>
					    </div>:
					    <div>
							<ul className="sql-list">
							{src_list.map((o,i)=><li key={i} 
							    onClick={this.sel(i)} 
							    className={classNames({'active':i===src_idx})}>{o.name}</li>)}
							</ul>
						</div>
				    }
				    <div className="center new_sql">
					    <Button type="green" onClick={this.newSrc}>{_("新增")}</Button>
				    </div>
                </div>
                <div className="right" style={{width:592}}>
                    <div style={{height:440, color:444}}>
                    	{ src_idx<0 ? 
                    		<Page style={{margin:0, padding:10, color:"#444"}} width={500}>
                    			<H4>{_("请选择/添加多维表格数据源")}</H4>
                    			<div style={{marginTop:10, fontSize:14}}>
                    				{_("支持飞书/WPS使用前请到飞书/WPS开放平台创建APP, 并获取appid和secret")}
                    				{!window.SPIRIT.bitable && <Error small>{_("你安装的打印精灵插件版本太低，不支持多维表格")}</Error>}
                    			</div>
                    		</Page>:
                    		<Tabs activeKey={cur_tab} onChange={(cur_tab)=>this.setState({cur_tab})}>
		                		<Tabs.Page key="fieldmap" title="字段映射" style={{height:400, overflow:"auto"}}>
		                			<FieldMap fields={fields} tp_vars={tp_vars} fmap={fieldmap} onSetFieldMap={this.onSetFieldMap}/>
		                		</Tabs.Page>
		                		<Tabs.Page key="filter" title="过滤条件">
		                			<Filter value={filter} onSetFilter={this.onSetFilter}/>
		                		</Tabs.Page>
		                	</Tabs>
		                }	
					</div>
	                 <Toolbar>
                        {src_idx>=0 && <ConfirmButton disable={loadding} msg={_("删除本条记录吗?")} onClick={this.del(id)}>{_("删除")}</ConfirmButton>}
	                    <Toolbar.Ext>
                		    <Button disable={loadding} onClick={this.show_help}>{_("使用说明")}</Button>
                		    <Button disable={loadding} onClick={this.close}>{_("关闭")}</Button>
                		    {src_idx >=0 && <Button disable={loadding} type="green" onClick={this.setData}>{loadding?_("数据加载中"):_("获取数据")}</Button>}
            		    </Toolbar.Ext>
            		 </Toolbar>
                </div>
            </div>
        )
    }
}

export default BitableConn
