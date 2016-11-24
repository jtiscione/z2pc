const mandelbrotCanvas = document.getElementById('mandel');
const ctx = mandelbrotCanvas.getContext('2d');
const width = mandelbrotCanvas.width, height = mandelbrotCanvas.height;
import Rx from 'rxjs/Rx';

import MyWorker from 'worker-loader!./algorithm.js';
const worker = new MyWorker();

console.log("starting...");

function paint(fractal) {
    const imageData = ctx.createImageData(fractal.width, fractal.height);
    imageData.data.set(fractal.pixelArray);
    ctx.putImageData(imageData, fractal.left, fractal.top);
}

worker.addEventListener('message', (e) => paint(e.data));

let params = {
    frameNumber: 0,
    top: 0,
    left: 0,
    x1: -2,
    y1: -4/3,
    x2: 1.0,
    y2: 4/3,
    width,
    height,
};
/*
const keyframes = Array(1000);

function addKeyFrame(params) {
    keyframes[params.frameNumber] = params;
}*/

const click$ = Rx.Observable.fromEvent(mandelbrotCanvas, 'click');

click$.subscribe(e => {
    e.preventDefault();
    const {x1, y1, x2, y2, width, height, frameNumber} = params;
    let scale = 10;
    params = Object.assign({}, params, {
        frameNumber: frameNumber + 1,
        x1: x1 + (e.offsetX / width) * (x2 - x1) - (x2 - x1) / (2 * scale),
        y1: y1 + (e.offsetY / height) * (y2 - y1) - (y2 - y1) / (2 * scale),
        x2: x1 + (e.offsetX / width) * (x2 - x1) + (x2 - x1) / (2 * scale),
        y2: y1 + (e.offsetY / height) * (y2 - y1) + (y2 - y1) / (2 * scale)
    });
    worker.postMessage(params);
});
/*
mandelbrotCanvas.addEventListener('click', (e) => {
    e.preventDefault();
    const {x1, y1, x2, y2, width, height, frameNumber} = params;
    let scale = 1.09;
    for (let i = 0; i < 8; i++) {
        params = Object.assign({}, params, {
            frameNumber: frameNumber + 1,
            x1: x1 + (e.offsetX / width) * (x2 - x1) - (x2 - x1) / (2 * scale),
            y1: y1 + (e.offsetY / height) * (y2 - y1) - (y2 - y1) / (2 * scale),
            x2: x1 + (e.offsetX / width) * (x2 - x1) + (x2 - x1) / (2 * scale),
            y2: y1 + (e.offsetY / height) * (y2 - y1) + (y2 - y1) / (2 * scale)
        });
        workers[0].postMessage(params);
    }
});
*/
/*
const workers = Array(1);
for (let i = 0; i < 1; i++) {
    workers[i] = new MyWorker();
    workers[i].addEventListener('message', (e) => paint(e.data));
 workers[0].postMessage(params);
}
*/

console.log("postMessage...");
worker.postMessage(params);
//paint(generateFractal(params));











/*
 function splitIntoTiles(params, tileWidth, tileHeight) {
 const {x1, y1, x2, y2, width, height, maxIters} = params;
 const tileArray = Array((width / tileWidth) * (height / tileHeight));
 const xstep = tileWidth * (x2 - x1) / width;
 const ystep = tileHeight * (y2 - y1) / height;

 for (let y = y1, i = 0; i < height / tileHeight; i++, y+= ystep) {
 for (let x = x1, j=0; j < width / tileWidth; j++, x += xstep) {
 tileArray.push({
 top: tileHeight * i,
 left: tileWidth * j,
 x1: x,
 y1: y,
 x2: x + xstep,
 y2: y + ystep,
 width: tileWidth,
 height: tileHeight,
 maxIters
 });
 }
 }
 return tileArray;
 }
 //var tiles = splitIntoTiles(params, 100, 100);
 //tiles.forEach((e) => worker.postMessage(e));

 */

//paint(generateFractal(params));
