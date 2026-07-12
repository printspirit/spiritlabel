import React, { Component, createRef, useState } from 'react';
import { Spreadsheet, Worksheet, jspreadsheet } from "@jspreadsheet-ce/react";
import { Button, Select, DivWin as W, Toolbar} from 'ecp';
import css from './ecp_react/input.module.scss'
import DBConn from './DBConn.jsx'
import {_} from "./locale.js";

import "jspreadsheet-ce/dist/jspreadsheet.css";
import "jsuites/dist/jsuites.css";

import "./jssicon.css"
import "./iconfont.css"

var COPIES_COL_NAME = _("$打印份数")

const ManInput = 0
const XLS = 1
const DB  = 2

const SheetJSFT = [
	"xlsx", "xlsb", "xlsm", "xls", "xml", "csv", "txt", "ods", "fods", "uos", "sylk", "dif", "dbf", "prn", "qpw", "123", "wb*", "wq*"
].map(function(x) { return "." + x; }).join(",");

const fileBtn = `
<span>
    <input type="file" style="display:none" accept="${SheetJSFT}" onChange="window.handleExcelFileSelect(event)"/>
    ${_("打开数据文件")}
</span>
`

function getColumnLetter(index) {
    let letter = '';
    while (index >= 0) {
        letter = String.fromCharCode(65 + (index % 26)) + letter;
        index = Math.floor(index / 26) - 1;
    }
    return letter;
}

// UI for bind vars
function BindVar(props) {
    let {bindVars, all_vars, columns, onSetHeader}=props;
    let [ toBind, setToBind] = useState(bindVars)
    const onClick=()=>{
        onSetHeader(toBind)
    }
    const setBindVars=(vn)=>(e)=>{
    	let val = e.target.value;
    	let old = Object.keys(toBind).find(key => toBind[key] === val);
    	if (old===vn) return;
    	
    	const newBind = { ...toBind };
    	newBind[vn] = val;
        if (old) newBind[old]=""
        setToBind(newBind)
    }
    return (
        <div>
        	<table className="table" style={{padding:10}}>
        	<tbody>
        	{ all_vars.map((v,idx)=>
		    	<tr key={idx}>
		    		<td style={{padding:5}}>{v}</td>
		    		<td><Select value={v in toBind?toBind[v]:""} onChange={setBindVars(v)} style={{width:100}}><option value=""></option>{columns.map((c,i)=><option key={i} value={i}>{c}</option>)}</Select></td>
		    	</tr>
		    )}
		    <tr ><td>---</td></tr>
		    { [COPIES_COL_NAME].map((v,idx)=>
		    	<tr key={idx}>
		    		<td style={{padding:5}}>{v}</td>
		    		<td><Select value={v in toBind?toBind[v]:""} onChange={setBindVars(v)} style={{width:100}}><option value=""></option>{columns.map((c,i)=><option key={i} value={i}>{c}</option>)}</Select></td>
		    	</tr>
		    )}
		    </tbody>
        	</table>
        	
            <Button onClick={onClick}>确定</Button>
        </div>    
    )
}

// 全局变量
let sheet = null;

export default class DataInput extends Component {
  
  state = {
    dataType: ManInput,
    bindVars: {},
  };

  jssRef = createRef();
  bindVarsRef = { current: this.state.bindVars };
  
  // 获取数据方法
  getData = (bind_vars) => {
    if (!sheet || !sheet[0]) return [];
    let {useCopies}=this.props
    return sheet[0]
      .getData()
      .filter(r => r.some(c => c !== ""))
      .map(r => {
        var r1 = {};
        for (let col in bind_vars) {
          let key = bind_vars[col];
          if (col === COPIES_COL_NAME) {
          	if (useCopies) r1["$copies"] = String(r[key] || "");
          } else {
            r1[col] = String(r[key] || "");
          }
        }
        return r1;
      });
  }

  // 销毁所有表格
  destroyAllSheet = () => {
    let n = jspreadsheet.spreadsheet.length;
    for (let spreadsheetIndex = 0; spreadsheetIndex < n; spreadsheetIndex++) {
      const spreadsheet = jspreadsheet.spreadsheet[0];
      jspreadsheet.destroy(spreadsheet.element);
    }
  }

  // 加载 Excel
  load_excel = (e) => {
    let inp = e.querySelectorAll('.icon-Excel>span>input');
    inp[0].click();
    inp[0].value = '';
  }

  // 上一步
  prevStep = () => {
    const { onDataChange, history } = this.props;
    if (sheet && sheet[0]) {
      onDataChange([[]]);
    }
    history.push("/print-tools/seltp");
  }

  // 下一步
  nextStep = async () => {
    const { sql, tpdata, rowcnt, useCopies, onDataChange, onSetSql, history } = this.props;
    const { dataType, bindVars } = this.state;
    var data;
	let tp_vars1 = tpdata.tp_vars.filter(o => !o.startsWith("spirit."));
      
    if (dataType === DB || dataType === XLS) {
      let vars = Object.entries(bindVars).filter(o => o[1] !== "").map(o => o[0]);
      for (let i = 0; i < tp_vars1.length; i++) {
        let v = tp_vars1[i];
        if (vars.indexOf(v) < 0) {
          W.alert(_("变量") + '"' + v + '"' + _("未绑定"));
          return;
        }
      }
      data = this.getData(bindVars);
    } else {
      let h = sheet[0].getHeaders(true);
      let bind_vars = {};
      for (let key in h) {
      	if (useCopies || tp_vars1.indexOf(h[key])>=0 ) {
	        bind_vars[h[key]] = key;
	    }    
      }
      data = this.getData(bind_vars);
    }

    if (data.length === 0) {
      W.alert(_("数据不能为空"));
      return;
    }

    if (dataType === DB) {
      sql.vars_map = {};
      for (let k in bindVars) {
        if (k !== bindVars[k]) sql.vars_map[k] = bindVars[k];
      }
      onSetSql(sql, data, rowcnt);
    } else {
      onDataChange(data);
    }
    history.push("/print-tools/doprint");
  }

  // Excel 文件选择处理器, 注意必须在创建组件时加载，退出时释放
  excel_handler = (e) => {
    const files = e.target.files;
    if (files && files[0]) this.do_execl_handler(files[0]);
  }

  // 处理 Excel 文件
  do_execl_handler = async (file) => {
    const reader = new FileReader();
    const rABS = !!reader.readAsBinaryString;
    const { tpdata, onUseCopies, onDataChange } = this.props;

    reader.onload = async (e) => {
      try {
        let XLSX = await import('xlsx');
        const bstr = e.target.result;
        const wb = XLSX.read(bstr, { type: rABS ? 'binary' : 'array', codepage: 65001, cellDates: true });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        let data = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });

        if (data.length === 0) {
          W.alert(_("没有数据"));
          return;
        }

        const { tp_vars } = tpdata;
        let header = data[0];
        let bind_vars = {};
        let has_copies = 0;
        for (let i = 0; i < header.length; i++) {
          let n = (header[i] || "").trim();
          if (n.length > 0 && n[0] === '.') n = n.substring(1);
          if (n.length > 0 && (tp_vars.indexOf(n) >= 0)) {
            bind_vars[i] = n;
          }
          if (n.length > 0 && (n === "$copies" || n === "$打印份数")) {
            bind_vars[i] = COPIES_COL_NAME;
            has_copies = 1;
          }
        }

        if (Object.keys(bind_vars).length === (tp_vars.filter(o => !o.startsWith("spirit.")).length + has_copies)) {
          data.shift();
          let d = data.map(r => {
            let r1 = {};
            for (let i = 0; i < r.length; i++) {
              if (bind_vars[i]) {
                r1[bind_vars[i]] = r[i];
              }
            }
            return r1;
          });

          this.destroyAllSheet();
          this.setState({ dataType: ManInput})
          onUseCopies(has_copies===1)
          onDataChange(d);
        } else {
          if (this.state.dataType !== XLS) {
            let yn = await W.confirm(_("导入文件字段和标签变量不一致，加载后需绑定变量才能使用。\n  \n继续吗?"));
            if (!yn) return;
          }

          onUseCopies(false)
          onDataChange(data);
          this.setState({ bindVars:{}, dataType: XLS });
          this.destroyAllSheet();
        }
      } catch (e) {
        console.error(e);
      }
    };

    if (rABS) reader.readAsBinaryString(file);
    else reader.readAsArrayBuffer(file);
  }

  // 设置 SQL 数据
  setSqlData = async ({ columns: db_cols, total, data }, sql_cfg) => {
    const { tpdata, onSetSql } = this.props;
    const { tp_vars } = tpdata;

    if (db_cols.length < tp_vars.filter(o => !o.startsWith("spirit.")).length) {
      W.alert(_("数据查询结果不正确"));
      return;
    }

    let bind_vars = {};
    if (sql_cfg.vars_map && Object.keys(sql_cfg.vars_map).length > 0) {
      bind_vars = sql_cfg.vars_map;
    } else {
      const tp_vars1 = tp_vars.filter(o => !o.startsWith("spirit."));
      for (let i = 0; i < tp_vars1.length; i++) {
        let item = tp_vars1[i];
        if (!db_cols.includes(item)) {
          let yn = await W.confirm(_("数据字段与标签不吻合"));
          if (yn === false) return false;
          break;
        }
      }

      for (let c of db_cols) {
        if (tp_vars.indexOf(c) >= 0) {
          bind_vars[c] = c;
        }
      }
    }

    this.destroyAllSheet();
    onSetSql(sql_cfg, data, total);
    this.setState({ dataType: DB, bindVars: bind_vars });
    return true;
  }

  // 数据库连接
  db_conn = () => {
    if (typeof window.SPIRIT.DBQueryList !== "function") {
      W.alert(
        <>
          <div>{_("打印插件版本太低,需要升级")}</div>
          <div><a href="/download/spirit-web-setup.exe">立即下载安装</a></div>
        </>
      );
      return;
    }
    W.show(
      <W.Dialog
        title={_("连接数据库")}
        width="800"
        height="500"
        btn_CANCEL
        onSubmit={(form, sqlcfg) => { form.close(); }}
      >
        <DBConn setSqlData={this.setSqlData} sql_conf={this.props.sql} />
      </W.Dialog>
    );
  }

  // 变量绑定
  var_binder = () => {
    const { tpdata } = this.props;
    const { dataType, bindVars } = this.state;

    if (dataType === ManInput) {
      W.alert(_("当前状态无需设置绑定关系"));
      return;
    }

    let all_vars = [
      ...(tpdata.tp_vars ? tpdata.tp_vars.filter(o => !o.startsWith("spirit.")) : [])
    ];

    let old_h = sheet[0].getHeaders(true);
    for (let i in old_h) {
      sheet[0].setHeader(i, this.getColumnLetter(i));
    }
    let cols = sheet[0].getHeaders(true);
    
    const onSetHeader = (h) => {
      let bv = { ...this.bindVarsRef.current };
      for (let b of Object.keys(h)) {
        if (typeof h[b] !== "undefined") {
          bv[b] = h[b];
          sheet[0].setHeader(h[b], b);
        }
      }
      this.setState({ bindVars: bv });
      this.props.onUseCopies(h[COPIES_COL_NAME]?true:false)
      dlg.close();
    };

    let dlg = W.show(
      <W.Dialog
        title={_("设置标签变量绑定关系")}
        width="300"
        height="500"
      >
        <BindVar 
          bindVars={this.bindVarsRef.current} 
          all_vars={all_vars} 
          columns={cols} 
          onSetHeader={onSetHeader}
        />
      </W.Dialog>
    );
  }

  // 设置使用份数
  set_use_copies = () => {
  	this.props.onUseCopies()
    this.destroyAllSheet();
  }

  // 重置数据
  resetData = async () => {
    const { onDataChange, onSetSql } = this.props;
    let yn = await W.confirm(_("清除当前数据吗？清除后不可恢复"));
    if (!yn) return;
    this.destroyAllSheet();
    this.setState({ dataType: ManInput });
    onSetSql(null, [], 0);
    onDataChange([]);
  }

  // 获取列字母
  getColumnLetter = (i) => {
    let s = '';
    while (i >= 0) {
      s = String.fromCharCode(65 + (i % 26)) + s;
      i = Math.floor(i / 26) - 1;
    }
    return s;
  }

  // 组件挂载
  componentDidMount() {
    const { tpdata, history, setStep } = this.props;

    if (Object.keys(tpdata).length === 0) {
      history.push("/print-tools/seltp");
      return;
    }
    setStep("loaddata");

    if (!window.handleExcelFileSelect) {
      window.handleExcelFileSelect = this.excel_handler;
    }

    jspreadsheet.setDictionary({
      'Insert a new column before': '在左边增加列',
      'Insert a new column after': '在右边边增加列',
      'Delete selected columns': '删除选中的列',
      'Order ascending': '升序排列',
      'Order descending': '降序排列',
      'Insert a new row before': '在上方增加行',
      'Insert a new row after': '在下方增加行',
      'Delete selected rows': '删除选中的行',
      'Copy': '拷贝',
      'Paste': '粘贴',
    });
  }

  // 更新 bindVars ref
  componentDidUpdate(prevProps, prevState) {
    if (prevState.bindVars !== this.state.bindVars) {
      this.bindVarsRef.current = this.state.bindVars;
    }
  }

  // 组件卸载
  componentWillUnmount() {
    if (this.jssRef.current) {
      jspreadsheet.destroy(this.jssRef.current);
    }
    window.handleExcelFileSelect=null
  }
  
  render() {
    const { columns, data, useCopies } = this.props;
    const { dataType, bindVars } = this.state;

    // 创建工具栏
    const toolbars = [
      { content: 'undo', title: "undo", onclick: () => { if (sheet && sheet[0]) sheet[0].undo(); } },
      { content: 'redo', title: "redo", onclick: () => { if (sheet && sheet[0]) sheet[0].redo(); } },
      { content: 'save', title: _("保存数据"), onclick: () => { if (sheet && sheet[0]) sheet[0].download(true, false); } },
      { content: 'autorenew', title: _("清除数据"), onclick: this.resetData },
      { type: 'divisor' },
      { content: fileBtn, title: _("加载EXCEL/CSV等格式的数据文件"), class: 'iconfont icon-Excel', onclick: this.load_excel },
      { content: `<span>${_("连接数据库")}</span>`, class: 'iconfont icon-database', title: _("连接数据库"), onclick: this.db_conn },
      { content: `<span>${_("变量绑定")}</span>`, class: 'iconfont icon-icon-customvar', title: _("设置字段和标签变量绑定关系"), onclick: this.var_binder },
      { content: `<span>${_("打印份数")}</span>`, class: 'iconfont icon-copies', title: _("按行设置打印份数"), onclick: this.set_use_copies },
      { type: 'divisor' },
      { content: 'fullscreen', title: _("全屏编辑"), onclick: () => { if (sheet && sheet[0]) sheet[0].parent.fullscreen(); } },
    ];

    // 如果 jssRef 存在，创建或更新 jspreadsheet
    if (this.jssRef.current) {
      if (!this.jssRef.current.textContent) {
		
		// 构建 headers
		let headers = [];
		switch (dataType) {
		  case ManInput:
		    headers = JSON.parse(JSON.stringify(columns));
		    if (useCopies) {
		    	headers.push({ title: COPIES_COL_NAME, type: "numeric", tooltip: _("设置打印份数，缺省为0") });
		    }	
		    break;
		  case XLS:
		    headers = new Array(Math.max(...data.map(r => r.length))).fill(null);
		    break;
		  case DB:
		    headers = Object.keys(data[0]).map(c => {
		      if (c in bindVars) {
		        return { title: bindVars[c], name: c };
		      }
		      return { title: c };
		    });
		    break;
		  default:
		    headers = [];
		}
		
		const h = (window.document.documentElement.clientHeight - 300) + 'px';
            
        const ws = jspreadsheet(this.jssRef.current, {
          toolbar: toolbars,
          tabs: false,
          allowExport: true,
          about: false,
          worksheets: [{
            minDimensions: [1, 20],
            tableOverflow: true,
            tableWidth: '100%',
            tableHeight: h,
            columns: headers,
            data: data,
            csvDelimiter: ',',
            allowInsertColumn: dataType === XLS,
            allowDeleteColumn: dataType === XLS,
            allowRenameColumn: dataType === XLS,
            allowComments: false,
          }],
        });
        sheet = ws;
      }
    }

    return (
      <>
        <div ref={this.jssRef} />
        <hr />
        <div style={{ float: "right" }}>
          <Button onClick={this.prevStep}>{_("上一步")}</Button>
          <Button type="green" onClick={this.nextStep}>{_("下一步")}</Button>
        </div>
      </>
    );
  }
}
