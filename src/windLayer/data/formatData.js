import wind from './wind.json'


const u = wind.data[0],
    v = wind.data[1],
    startlon = wind.startlon,
    startlat = wind.startlat,
    endlon = wind.endlon,
    endlat = wind.endlat;
let windData = {};
windData.uMax = Math.max(...u);
windData.uMin = Math.min(...u);
windData.vMax = Math.max(...v);
windData.vMin = Math.min(...v);
windData.img = new Uint8Array(u.length * 4);
windData.vertices = [startlon, endlat, 0, startlon, startlat, 0, endlon, startlat, 0, endlon, startlat, 0, endlon, endlat, 0, startlon, endlat, 0]
windData.lonSize = wind.lonsize;
windData.latSize = wind.latsize;
for (let i = 0; i < u.length; i++) {
    // r: u分量速度差
    windData.img[4 * i] = Math.floor(255 * (u[i] - windData.uMin) / (windData.uMax - windData.uMin));
    // g: v分量速度差
    windData.img[4 * i + 1] = Math.floor(255 * (v[i] - windData.vMin) / (windData.vMax - windData.vMin));
    // b = 0
    windData.img[4 * i + 2] = 0;
    // a = 255
    windData.img[4 * i + 3] = 255;
}

export default windData;