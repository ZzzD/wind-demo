/* global document */
import React, {Component} from 'react';
import {render} from 'react-dom';
import MapGL from 'react-map-gl';
import DeckGL from 'deck.gl';
import PaticleLayer from './src/windLayer/wind-layer'
import {default as wind} from './src/windLayer/data/formatData'
import {FPSStats} from 'react-stats'

// Set your mapbox token here
const MAPBOX_TOKEN = 'pk.eyJ1IjoibWV0bGVkIiwiYSI6ImNqMTBkZTBueTAyd3ozM3BlMzFuaGI4bW4ifQ.t_UhPTUeg25R1BaYoMt8FQ'; // eslint-disable-line

class Root extends Component {

    constructor(props) {
        super(props);
        this.state = {
            viewport: {
                latitude: 38.46,
                longitude: 108.71,
                zoom: 2.2
            },
            width: window.innerWidth,
            height: window.innerHeight,
        };
        window.addEventListener('resize', () => this.setState({width: window.innerWidth, height: window.innerHeight}));
    }

    render() {
        const {viewport, width, height} = this.state;

        return (
            <MapGL
                {...viewport}
                width={width}
                height={height}
                mapboxApiAccessToken={MAPBOX_TOKEN}
                onChangeViewport={viewport => this.setState({viewport})}>
                <DeckGL
                    {...viewport}
                    width={width}
                    height={height}
                    debug
                    layers={[
                        new PaticleLayer({
                            ...wind
                        })
                    ]}/>
                <FPSStats/>
            </MapGL>
        );
    }
}

render(<Root />, document.body.appendChild(document.createElement('div')));
