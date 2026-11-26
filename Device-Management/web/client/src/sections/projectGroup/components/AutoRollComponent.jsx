import React, { Component } from 'react';
import { Row, Col } from 'antd';

export default class AutoRollComponent extends Component {

    constructor(props) {
        super(props);
        this.scrollElem = null;
        this.stopscroll = false;
        this.preTop = 0;
        this.cloneEle = null;
        this.currentTop = 0;
        this.marqueesHeight = 0;
        this.interval = null;
        this.state = {
            enabledScroll: false
        }
    }

    get enabledScroll () {
        let scrollElem = document.getElementById(this.props.divId);
        let fatherElem = scrollElem?.parentNode || null;
        if (scrollElem && fatherElem) {
            return scrollElem.scrollHeight > fatherElem.scrollHeight
        }

        return false;
    }


    marque = (height) => {
        try {
            this.scrollElem = document.getElementById(this.props.divId);
            this.marqueesHeight = height;
            if (this.scrollElem) {
                this.scrollElem.style.height = this.marqueesHeight;
                this.scrollElem.style.overflow = 'hidden';
            }
            this.repeat();
        } catch (e) { console.log(e) }
    }


    repeat = () => {
        this.scrollElem.scrollTop = 0;
        let offset = 1.5

        this.interval = setInterval(() => {
            if (this.stopscroll) return;
            this.currentTop = this.currentTop + offset;
            this.preTop = this.scrollElem.scrollTop;
            this.scrollElem.scrollTop = this.scrollElem.scrollTop + offset;
            if (this.preTop === this.scrollElem.scrollTop) {
                this.scrollElem.scrollTop = this.marqueesHeight;
                this.scrollElem.scrollTop = this.scrollElem.scrollTop + offset;
            }
        }, 100);
    }

    componentWillUnmount () {
        clearInterval(this.interval);

    }

    componentWillReceiveProps (nextProps) {
        requestAnimationFrame(() => {
            if (this.enabledScroll) {
                if (!this.state.enabledScroll) {
                    this.setState({ enabledScroll: true }, () => {
                        this.marque(10)
                    })
                }

            }
        })
    }

    componentDidMount () {
        if (this.enabledScroll) {
            this.setState({ enabledScroll: true }, () => {
                this.marque(10)
            })
        }
    }

    onMouseOver = () => {
        this.stopscroll = true;
        // console.log('this.scrollElem',this.scrollElem)
        if (this.scrollElem) {
            this.scrollElem.addEventListener('wheel', this.handleScroll);
        }
    }

    onMouseOut = () => {
        this.stopscroll = false;
        if (this.scrollElem) {
            this.scrollElem.removeEventListener('wheel', this.handleScroll);
        }
    }

    handleScroll = (event) => {
        console.log('event', event) 
        event.preventDefault();
        this.scrollElem.scrollTop += event.deltaY;
    }

    render () {

        const { changeStyleCol, heads, spans, data, divId, divHeight, content, containerStyle = {} } = this.props;
        return (
            <div style={{ ...containerStyle, textAlign: 'left' }}>
                {
                    heads ?
                        <Row style={{ lineHeight: '40px', height: 40 }}>
                            {heads.map((c, index) => {
                                return <Col span={spans[index]} key={index}>{c}</Col>
                            })
                            }
                        </Row> : ''
                }

                <div id={divId} style={{ overflow: 'hidden', height: divHeight }} onMouseOver={this.onMouseOver} onMouseOut={this.onMouseOut}>
                    <div>
                        {content ? content : ''}
                        {/* {this.state.enabledScroll && content ? content : ''} */}
                        {
                            data ?
                                data.map((q, idx) => {
                                    return (
                                        <div key={idx}>
                                            <Row gutter={16} style={{ borderBottom: '0px solid grey' }}>
                                                {heads.map((c, index) => {
                                                    return <Col span={spans[index]} key={index} style={{ paddingTop: 8, textAlign: 'left', wordBreak: 'break-word', color: `${c === changeStyleCol ? q.changeColor : ''}` }}>
                                                        {index == 1 ? q.data[index] == -1 ? "-" : q.data[index] : index == 2 ? q.data[1] == -1 ? '-' : q.data[index] : q.data[index]}</Col>
                                                })
                                                }
                                            </Row>
                                        </div>
                                    )
                                }) : ''
                        }
                        <div style={{ margin: 16 }}></div>
                    </div>
                </div>
            </div >
        )
    }
}