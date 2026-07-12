import React from 'react';
import {H1, Button} from 'ecp';

class Finish extends React.Component {

    /* 状态 */
    state={
    }
    
    componentDidMount=()=>{
    	this.props.setStep("finish")
    }
    
    printAnother=()=>{
    	this.props.onResetAll();
    	this.props.history.push("/print-tools");
    }
    
    render() { 
        const { printer, dir } = this.props.location.state;
    
    	return (
    	   <div className="center">
	      	<H1>打印结束</H1>
	      	<br/>
	      	{ ["Spirit Image", "Microsoft Print to PDF", "Microsoft XPS Document Writer"].some(p=>printer.startsWith(p)) && 
	      	  <div className="print-result">请到<span>{dir}</span>查看打印结果</div>}
	      	<Button type="green" onClick={this.printAnother}>继续打印</Button>
    	   </div>
    	);
    }
    
}

export default Finish
