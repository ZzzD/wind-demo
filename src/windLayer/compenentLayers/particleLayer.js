/* eslint-disable max-len */
import {Layer, assembleShaders} from 'deck.gl';
import {GL, Model, Geometry, Texture2D, Framebuffer, Program} from 'luma.gl';
import solidPolygonVertex from './solid-polygon-layer-vertex.glsl';
import solidPolygonFragment from './solid-polygon-layer-fragment.glsl';
import drawParticlesVertex from './draw-particles-vert'
import drawParticlesFragment from './draw-particles-frag'
import updataParticlesVertex from './quad.vert'
import updataParticlesFragment from './updata-particles-frag'
import drawTextureFragment from './draw-texture-frag'
const defaultRampColors = {
    0.0: '#3288bd',
    0.1: '#66c2a5',
    0.2: '#abdda4',
    0.3: '#e6f598',
    0.4: '#fee08b',
    0.5: '#fdae61',
    0.6: '#f46d43',
    1.0: '#d53e4f'
};

const defaultProps = {
    lonSize: 281,
    latSize: 281,
    numParticles: 65536,
    particleRes: 256,
    fadeOpacity: 0.996,
    speedFactor: 0.25,
    dropRate: 0.003,
    dropRateBump: 0.01
};

export default class SolidPolygonLayer extends Layer {

    initializeState() {
        const {gl} = this.context;
        const {latSize, lonSize, numParticles, particleRes, img} = this.props
        const windTexture = new Texture2D(gl, {
            height: latSize,
            width: lonSize,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            data: img
        });
        let particlePositions = new Float32Array(numParticles * 4);
        for (let i = 0; i < numParticles * 4; i++) {
            particlePositions[i] = Math.floor(Math.random() * 256)
        }
        const colorRampTexture = new Texture2D(gl, {
            height: 16,
            width: 16,
            minFilter: gl.LINEAR,
            magFilter: gl.LINEAR,
            data: this.getColorRamp(defaultRampColors)
        });
        let backgroundTexture = new Texture2D(gl, {
            height: gl.canvas.height,
            width: gl.canvas.width,
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            data: new Uint8Array(gl.canvas.width * gl.canvas.height * 4)
        });

        // let screenTexture = new Texture2D(gl, {
        //     height: gl.canvas.height,
        //     width: gl.canvas.width,
        //     minFilter: gl.NEAREST,
        //     magFilter: gl.NEAREST,
        //     data: new Uint8Array(gl.canvas.width * gl.canvas.height * 4)
        // });
        let particlePositionsTexture0 = new Texture2D(gl, {
            height: particleRes,
            width: particleRes,
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            data: particlePositions
        });
        // let particlePositionsTexture1 = new Texture2D(gl, {
        //     height: particleRes,
        //     width: particleRes,
        //     minFilter: gl.NEAREST,
        //     magFilter: gl.NEAREST,
        //     data: particlePositions
        // });
        let screenFB = new Framebuffer(gl, {
            id: 'screenFB',
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            width: gl.canvas.width,
            height: gl.canvas.height,
            format: GL.RGBA
        })
        let particlesFB = new Framebuffer(gl, {
            id: 'particlesFB',
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            width: particleRes,
            height: particleRes,
            format: GL.RGBA,
            type: GL.FLOAT
        });
        let particleIndex = [];
        for (let i = 0; i < this.props.numParticles; i++) {
            particleIndex[i] = i;
        }
        let drawParticlesProgram = new Program(gl, {
            vs: drawParticlesVertex,
            fs: drawParticlesFragment
        });
        this.setState({
            models: this._getModel(gl),
            wind: windTexture,
            colorRampTexture,
            backgroundTexture,
            // screenTexture,
            particlePositionsTexture0,
            // particlePositionsTexture1,
            screenFB,
            particlesFB,
            drawParticlesProgram
        })
    }

    updateState({props, oldProps, changeFlags}) {
        super.updateState({props, oldProps, changeFlags});
    }

    _getModel(gl) {
        const drawToScreen = new Model({
            gl,
            id: this.props.id,
            ...assembleShaders(gl, {
                vs: solidPolygonVertex, fs: solidPolygonFragment, modules: []
            }),
            geometry: new Geometry({
                drawMode: GL.TRIANGLES,
                positions: {size: 3, value: new Float32Array(this.props.vertices)},
                txcoord: {size: 2, value: new Float32Array([0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 0 ,1])}
            })
        });

        let particleIndex = [];
        for (let i = 0; i < this.props.numParticles; i++) {
            particleIndex[i] = i;
        }
        const drawParticles = new Model({
            gl,
            vs: drawParticlesVertex,
            fs: drawParticlesFragment,
            geometry: new Geometry({
                drawMode: 'POINTS',
                a_index: {size: 1, value: new Float32Array(particleIndex).map((v, i, array) => array[i] = i)}
            }),
            vertexCount: this.props.numParticles
        });

        const updataParticles = new Model({
            gl,
            ...assembleShaders(gl, {
                vs: updataParticlesVertex, fs: updataParticlesFragment, modules: []
            }),
            geometry: new Geometry({
                positions: {size: 3, value: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0])}
            })
        });

        const drawTexture = new Model({
            gl,
            ...assembleShaders(gl, {
                vs: updataParticlesVertex, fs: drawTextureFragment, modules: []
            }),
            geometry: new Geometry({
                positions: {size: 3, value: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0])}
            })
        });

        return {drawToScreen, drawParticles, updataParticles, drawTexture}
    }

    getColorRamp(colors) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 256;
        canvas.height = 1;

        const gradient = ctx.createLinearGradient(0, 0, 256, 0);
        for (const stop in colors) {
            gradient.addColorStop(+stop, colors[stop]);
        }

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 256, 1);

        return new Uint8Array(ctx.getImageData(0, 0, 256, 1).data);
    }

    draw({uniforms}) {
        const { gl } = this.context
        const { fadeOpacity, particleRes, uMin, uMax, vMin, vMax, lonSize, latSize, speedFactor, dropRate, dropRateBump } = this.props;
        let { models, wind, colorRampTexture, backgroundTexture, particlePositionsTexture0, particlePositionsTexture1, screenFB, particlesFB} = this.state
        particlesFB.bind()
        gl.viewport(0, 0, this.props.particleRes, this.props.particleRes);
        models.updataParticles.render(Object.assign(
            {},
            uniforms,
            {
                u_wind: wind,
                u_particles: particlePositionsTexture0,
                u_rand_seed: Math.random(),
                u_wind_res: [lonSize, latSize],
                u_wind_min: [uMin, vMin],
                u_wind_max: [uMax, vMax],
                u_speed_factor: speedFactor,
                u_drop_rate: dropRate,
                u_drop_rate_bump: dropRateBump
            }
        ));
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        screenFB.bind();
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

        models.drawTexture.render(Object.assign(
            {},
            uniforms,
            {
                u_screen: backgroundTexture,
                fadeOpacity: fadeOpacity
            }
        ));
        models.drawParticles.render(Object.assign(
            {},
            uniforms,
            {
                u_wind: wind,
                u_particles: particlesFB.texture,
                u_color_ramp: colorRampTexture,
                u_particles_res: particleRes,
                u_wind_min: [uMin, vMin],
                u_wind_max: [uMax, vMax]
            }
        ))
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        models.drawToScreen.render(Object.assign(
            {},
            uniforms,
            {wind: screenFB.texture}
        ));

        gl.disable(gl.BLEND);
        this.setState({
            particlePositionsTexture0: particlesFB.texture,
            backgroundTexture: screenFB.texture
        })
    }
    // drawParticles() {
    //     const { gl } = this.context
    //     const { fadeOpacity, particleRes, uMin, uMax, vMin, vMax, lonSize, latSize, speedFactor, dropRate, dropRateBump } = this.props;
    //     let { drawParticlesProgram, models, wind, colorRampTexture, backgroundTexture, screenTexture, particlePositionsTexture0, particlePositionsTexture1, screenFB, particlesFB} = this.state
    //     drawParticlesProgram.use;
    //     let a_index = new Buffer(gl).setData({
    //         data: new Float32Array(particleIndex),
    //         size: 1
    //     });
    //
    // }
}

SolidPolygonLayer.layerName = 'SolidPolygonLayer';
SolidPolygonLayer.defaultProps = defaultProps;
