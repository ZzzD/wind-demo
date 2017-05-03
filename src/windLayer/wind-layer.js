/* eslint-disable max-len */
import {Layer, assembleShaders} from 'deck.gl';
import {GL, Model, Geometry, Texture2D, Framebuffer, Program} from 'luma.gl';
import drawScreenVertex from './shaders/draw-screen-vert';
import drawScreenFragment from './shaders/draw-screen-frag';
import drawParticlesVertex from './shaders/draw-particles-vert'
import drawParticlesFragment from './shaders/draw-particles-frag'
import updataParticlesVertex from './shaders/quad.vert'
import updataParticlesFragment from './shaders/updata-particles-frag'
import drawTextureFragment from './shaders/draw-texture-frag'
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

        let particlePositionsTexture0 = new Texture2D(gl, {
            height: particleRes,
            width: particleRes,
            minFilter: gl.NEAREST,
            magFilter: gl.NEAREST,
            data: new Uint8Array(particlePositions)
        });
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
            particlePositionsTexture0,
            screenFB,
            particlesFB,
            drawParticlesProgram
        })
    }

    updateState({props, oldProps, changeFlags}) {
        super.updateState({props, oldProps, changeFlags});
    }

    _getModel(gl) {
        // 
        const drawToScreen = new Model({
            gl,
            id: this.props.id,
            ...assembleShaders(gl, {
                vs: drawScreenVertex, fs: drawScreenFragment, modules: []
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

        // draw particles to framebuffer(screenFB)
        const drawParticles = new Model({
            id: 'drawParticles',
            gl,
            vs: drawParticlesVertex,
            fs: drawParticlesFragment,
            geometry: new Geometry({
                drawMode: 'POINTS',
                a_index: {size: 1, value: new Float32Array(particleIndex)},
                vertexCount: this.props.numParticles
            })
        });
        // draw new positions of particles to framebuffer(particlesFB)
        const updataParticles = new Model({
            gl,
            ...assembleShaders(gl, {
                vs: updataParticlesVertex, fs: updataParticlesFragment, modules: []
            }),
            geometry: new Geometry({
                positions: {size: 3, value: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0])}
            })
        });
        // draw texture of last frame to framebuffer(screenFB)
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
        gl.viewport(0, 0, this.props.particleRes, this.props.particleRes);
        particlesFB.bind()
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
        particlesFB.unbind();
        gl.disable(gl.DEPTH_TEST);
        gl.disable(gl.STENCIL_TEST);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
        screenFB.bind();

        models.drawTexture.render(Object.assign(
            {},
            uniforms,
            {
                u_screen: backgroundTexture,
                fadeOpacity: 0.996
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
        // screenFB.unbind();
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        models.drawToScreen.render(Object.assign(
            {},
            uniforms,
            {wind: screenFB.texture}
        ));
        //
        gl.disable(gl.BLEND);
        console.log(particlePositionsTexture0, particlesFB.texture)
        particlePositionsTexture0.copyImageFromFramebuffer({
            framebuffer: particlesFB,
            // offset = 0,
            x: 0,
            y: 0,
            width: particleRes,
            height: particleRes,
            mipmapLevel: 0,
            internalFormat: GL.RGBA,
            // type = GL.UNSIGNED_BYTE,
            border: 0
        });
        backgroundTexture.copyImageFromFramebuffer({
            framebuffer: screenFB,
            // offset = 0,
            x: 0,
            y: 0,
            width: gl.canvas.width,
            height: gl.canvas.height,
            mipmapLevel: 0,
            internalFormat: GL.RGBA,
            border: 0
        })
        this.setState({
            particlePositionsTexture0: particlePositionsTexture0,
            backgroundTexture: backgroundTexture
        })
    }
}

SolidPolygonLayer.layerName = 'SolidPolygonLayer';
SolidPolygonLayer.defaultProps = defaultProps;
