import React,  { Suspense } from 'react';
import {BrowserRouter as Router, Route  } from 'react-router-dom'; 
import {Page, Stepper, DivWin as W} from 'ecp';
import './App.css'
//import DataInputJss from './DataInputJss.jsx'
import Seltp from './Seltp.jsx'
//import DoPrint from './DoPrint.jsx'
import Finish from './Finish.jsx'
import Login from './login.jsx'
import spirit_power from './spirit.svg';
import {setLanguage, _} from "./locale.js";
import {load_spirit_js} from "./load_spirit.js";
import nologin_avt from './nologin_avt.svg';


const DataInputJss = React.lazy(() => import('./DataInputJss.jsx'));
const DoPrint = React.lazy(() => import( './DoPrint.jsx'));

const Loading=(props)=>{
	return (
		<div className="app-loading-overlay">
			<div style={{textAlign:"center"}}>
			    
    		</div>	
		</div>
	)
}

export default class App extends React.Component {

	state ={
		step:"seltp", 
		tpdata : {},            // 模板数据
		data:[[]],              // 录入数据
		rowcnt:0,               // 数据行
		columns:[],             // 列
		useCopies:false,        // 是否按行设置打印份数
		print_opts:{type:'auto'}
	}
	
	componentDidMount=async ()=>{
    	/*if (!window.SPIRIT) {
    	    try {
        	    await load_spirit_js(0);
		        this.forceUpdate()
		    }catch(e){
		    }
		}*/
		
		this.loadEditorState()
		
    }
    
    loadEditorState=async ()=>{
	    const url = '/api/editor-state';
		let response = await fetch(url)
		let rc = await response.json();
		if (rc.rc !== 'OK') return;
		let { NeedLogin, HasShares, Userinfo} = rc
		this.setState({NeedLogin, HasShares, Userinfo});
	}

	setStep=(step)=>{
		this.setState({step});
	}
	
	onResetAll=()=>{
		this.setState({tpdata:{}, data:[[]], rowcnt:0, columns:[]})
	}

	onSetData=(data, columns)=>{
	    if (columns) this.setState({columns})
		this.setState({data, rowcnt:data.length})
	}
	
	onSetSql=(sql, data, rowcnt)=>{
		this.setState({sql, data, rowcnt})
	}

	onChangeTp=(tpdata)=>{
    	let  columns = tpdata.tp_vars?tpdata
                    .tp_vars
                    .filter(o=>!o.startsWith("spirit."))
                    .map(o=>{ return {title:o, name:o}})
                    :
                    []
	    let data=[]
		for(let i=0; i<10; i++) data.push({});
		this.setState({tpdata, data, columns, sql:null});
	}
	
	onChangePrintOpts=(print_opts)=>{
		this.setState({print_opts})
	}
	
	onUseCopies=(b)=>{
		if (typeof b ==="undefined") {
			this.setState(({useCopies}) => ({
    		  useCopies: !useCopies
    		}));
    	}else{
	    	this.setState({useCopies:b}) 
    	}
	}
	
	logout=()=>{
    	fetch('/api/logout')
		.then((response)=>{
			return response.json();
		}).then((rc)=>{
			if (rc.rc!=='OK') return;
			this.setState({Userinfo:null});
	    });
	}
	
	onLogin=(st, userinfo)=>{
	    const {login_fun}=this.state;
		if (st===true) {
		    if (login_fun ) {
			    login_fun();
    		}
    		if (userinfo.token && window.SPIRIT && window.SPIRIT.License) {
    		    window.SPIRIT.License("InstToken", userinfo.token)
    		}
    		this.setState({login_fun:null, Userinfo:userinfo});	
		}
	}
	
	login=(loginFunc)=>{
        W.show(
		    <W.Dialog title={_("登陆")} height="400">
		        <Login onLogin={this.onLogin} postlogin={loginFunc}/>
		    </W.Dialog>
	    );
	}
	
	tagLogin=async()=>{
    	let {Userinfo}=this.state;
	    if (Userinfo) {
	        let yn = await W.confirm(_("退出登陆吗?"))
			if (yn===true) {
		        this.logout()
		    }
	    }else{
    	    this.login()
    	}
	}
		
	render() {
		const {tpdata, step, columns, data, rowcnt, useCopies, sql, print_opts, NeedLogin, Userinfo}=this.state;
		const isDesktop=window.SPIRIT?(window.SPIRIT.type==="desktop"?true:false):false
		let lang=""
		if (window.location.pathname.startsWith("/en/")) {
		    setLanguage("en");
		    lang="en"
		}
		const steps= [{seltp:_("选择标签")}, {loaddata:_("录入数据")}, {doprint:_("打印设置")}, {finish:_("完成打印")}];
		return (
			<Router basename={lang}>
				<div className="App-header">
					<span className="App-Logo">
    					{ isDesktop ?
	        	            <a href="/home.html">
							    <img src={spirit_power} alt="logo" />
						    </a>
	    	                :
	    	                <a href={"/"+lang} target="_main">
							    <img src={spirit_power} alt="logo" />
    						</a>}
					</span>
					<h1 className="App-Title">SpiritLabel {_("标签打印")}</h1>
					<span className="App-Login-st">
	              	{ NeedLogin && <div className="Login-st" title ={Userinfo?Userinfo.Name:_("未登录")} onClick={this.tagLogin}>
	                  	    <img src={Userinfo && Userinfo.HeaderImg ? Userinfo.HeaderImg : nologin_avt} 
	                  	         className="rounded-circle img-fluid userlogo" 
	                  	         alt={Userinfo?Userinfo.Name:_("未登录")}
	                  	         />
	                  	     <span className="ml-1 mt-1 username" >{Userinfo?Userinfo.Name:_("未登录")}</span>
			            </div>}
    	            </span>
    	            
				</div>
				<Page>
					<Stepper className="App-steps" steps={steps} current={step}  width="80%"/>
					
					<div style={{height:50}} />
					{!window.SPIRIT &&
            		    <div className="spirit-download">
    	                {_("SpiritWeb打印插件尚未安装!")} <a href="/download/spirit-web-setup.exe">{_("立刻安装")}</a> <a href="/doc/install.md">{_("查看说明")}</a>
	                    </div>}
					
					<Suspense fallback={<Loading/>}>
					<Route path="/print-tools" exact  render={props =><Seltp {...props} 
							setStep={this.setStep} 
							onChangeTp={this.onChangeTp}
							tpdata={tpdata}
							Userinfo={Userinfo}
							login={this.login}
						/>}  />
						
					<Route path="/print-tools/seltp"  exact render={props =><Seltp {...props} 
							setStep={this.setStep} 
							onChangeTp={this.onChangeTp}
							tpdata={tpdata}
							Userinfo={Userinfo}
							login={this.login}
						/>} />	
						
					<Route path="/print-tools/seltp/:id"  render={props =><Seltp {...props} 
							setStep={this.setStep} 
							onChangeTp={this.onChangeTp}
							tpdata={tpdata}
						/>} />
					<Route path="/print-tools/loaddata" render={props =><DataInputJss {...props} 
        					columns={columns}
							data={data} 
							tpdata={tpdata}
							sql={sql}
							rowcnt={rowcnt}
							setStep={this.setStep} 
							useCopies={useCopies}
							onUseCopies={this.onUseCopies}
							onDataChange={this.onSetData}
							onSetSql={this.onSetSql}
						/>}/>
					<Route path="/print-tools/doprint" render={props =><DoPrint {...props} 
							setStep={this.setStep} 
							tpdata={tpdata}
							columns={columns}
							data={data}
							sql={sql}
							rowcnt={rowcnt}
							print_opts={print_opts}
							onChangePrintOpts={this.onChangePrintOpts}
						/>} />
					<Route path="/print-tools/finish"  render={props =><Finish {...props} 
							setStep={this.setStep} 
							onResetAll={this.onResetAll}
						/>} />
					</Suspense>
				</Page>
			</Router>
	  )
	}	    
}

