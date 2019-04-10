import React, { Component } from 'react';
import {socket} from '../Router';

import Logo from "../Game/Utilities/Logo";

import Timer from './Utilities/Timer';
import Question from './Question';
import Response from './Response';

class Prompt extends Component {
    constructor(props) {
        super(props);
        this.state = {
            redirect: false
        }
    }

    componentDidMount() {
        //this.id = setTimeout(() => this.props.handleTransition(), 3000);
    }

    componentWillUnmount() {
        // !!!
        // clearTimeout(this.id);
    }
    render() {

        return (
            <div>
                <Logo/>
                <Timer time={this.props.time}/>
                <Question question={this.props.question}/>
                <br/>
                <br/>
                <Response/>
            </div>
        );

    }

}

export default Prompt;
