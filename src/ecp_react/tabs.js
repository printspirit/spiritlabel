import React from 'react';
import Toolbar from './toolbar';
import {classNames} from './util.js';
import css from './tabs.module.css'

function Page() {
	return null;	
}

class Tabs extends React.Component {
	
	render() {
		
		let head=[];
		let act_page=null;
		let toolbar=null;
		let {pages, small, highlight, children, onChange, activeKey, className}=this.props;
		
		if (pages) {
			for (let k in pages) {
				head.push(<li className={activeKey===k?css.on:''} key={k}>
					<div className={css.tb_cl} onClick={()=>onChange(k)}>{pages[k]}</div></li>);
			};
		}else{
			head=React.Children.map(children, (c, i)=>{
				if (c.type===Page) {
					let cls=''
					if (c.key===activeKey) {
						cls+=css.on;
						act_page=c;
					}
					return(
						<li className={cls} key={c.key} onClick={()=>onChange(c.key)}>
							<div className={css.tb_cl}>{c.props.title}</div>
						</li>
					);	
				}else if (c.type===Toolbar) {
					toolbar=<Toolbar.Ext>{c.props.children}</Toolbar.Ext>
				}
				return null;
			});
		}	
		
		if (!pages && act_page==null) act_page=Array.isArray(children)?children[0]:null;
		
		let cls=classNames(css.tab_hd, className, {[css.small]:small, [css.highlight]:highlight});
		return  (
			<div>
				<div className={cls}>
					<ul>{head}</ul>
					{toolbar}
				</div>
				{!pages && act_page &&
					<div style={{...act_page.props.style, margin:'2px 0px'}}>{act_page && act_page.props.children}</div>
				}
			</div>	
		);
	}	
}

Tabs.Page=Page;

export {Tabs as default, Page}
