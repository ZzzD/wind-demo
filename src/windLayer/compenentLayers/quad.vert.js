export default `\
#define SHADER_NAME updata-particles-vert-shader
precision mediump float;

attribute vec3 positions;

varying vec2 v_tex_pos;

void main() {
    v_tex_pos = positions.xy;
    gl_Position = vec4(1.0 - 2.0 * positions, 1);
    gl_PointSize = 5.0;
}
`;