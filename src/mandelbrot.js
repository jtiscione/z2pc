import Rx from 'rxjs/Rx';
import MyWorker from 'worker-loader!./algorithm.js';

const mandelbrotCanvas = document.getElementById('mandel');
const ctx = mandelbrotCanvas.getContext('2d');
const width = mandelbrotCanvas.width, height = mandelbrotCanvas.height;
const worker = new MyWorker();

const ZOOMFACTOR = 10.0;

let zoomRectangle = null;

function mouseCoords(e) {
    let offsetX = e.offsetX, offsetY = e.offsetY;
    if (!offsetX && !offsetY) {
        // Firefox...
        const tgt = e.target || e.srcElement;
        const rect = tgt.getBoundingClientRect();
        offsetX = e.clientX - rect.left,
        offsetY  = e.clientY - rect.top;
    }
    return [offsetX, offsetY];
}


function interpolateX(params, offsetX) {
    const {x1, x2, width} = params;
    return x1 + (offsetX / width) * (x2 - x1);
}

function interpolateY(params, offsetY) {
    const {y1, y2, height} = params;
    return y1 + (offsetY / height) * (y2 - y1);
}

function interpolateZoomRect(params, offsetX, offsetY, zoom = ZOOMFACTOR) {
    const {x1, y1, x2, y2, width, height} = params;

    offsetX = Math.max(offsetX, width / 2 / zoom);
    offsetX = Math.min(offsetX, width - (width / 2 / zoom));
    offsetY = Math.max(offsetY, height / 2 / zoom);
    offsetY = Math.min(offsetY, height - (height / 2 / zoom));
    return {
        x1: interpolateX(params, offsetX, zoom) - (x2 - x1) / (2 * zoom),
        x2: interpolateX(params, offsetX, zoom) + (x2 - x1) / (2 * zoom),
        y1: interpolateY(params, offsetY, zoom) - (y2 - y1) / (2 * zoom),
        y2: interpolateY(params, offsetY, zoom) + (y2 - y1) / (2 * zoom),
    };
}

function paint(fractal) {
    console.log("done: "+fractal.done+", maxIters:"+fractal.maxIters);
    const imageData = ctx.createImageData(fractal.width, fractal.height);
    imageData.data.set(fractal.pixelArray);
    ctx.putImageData(imageData, fractal.left, fractal.top);
}

function worker$(params) {
    worker.postMessage(params);
    return Rx.Observable.fromEvent(worker, 'message')
        .map(event => event.data)
        .takeWhile(results => params.frameNumber === results.frameNumber);
}

function render(params) {
    worker$(params).subscribe(paint);
}

//worker.addEventListener('message', (e) => paint(e.data));

let params = {
    frameNumber: 0,
    top: 0,
    left: 0,
    x1: -2,
    y1: -1.15,
    x2: 1.0,
    y2: 1.15,
    width,
    height,
    paletteIndex: Math.floor(100 * Math.random()),
};

Rx.Observable.fromEvent(mandelbrotCanvas, 'mouseout').subscribe(e => {
    console.log("noZoomRectangle");
    zoomRectangle = null;
});

const mouseover$ = Rx.Observable.fromEvent(mandelbrotCanvas, 'mousemove');
mouseover$.subscribe(e => {
    e.preventDefault();
    let [offsetX, offsetY] = mouseCoords(e);
    console.log('mousemove('+offsetX+", "+offsetY+")");
});

const click$ = Rx.Observable.fromEvent(mandelbrotCanvas, 'click').debounceTime(500);

click$.subscribe(e => {
    e.preventDefault();
    const [offsetX, offsetY] = mouseCoords(e);
    params = Object.assign({}, params, interpolateZoomRect(params, offsetX, offsetY), {frameNumber: params.frameNumber + 1});
    render(params);
});

render(params);




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
