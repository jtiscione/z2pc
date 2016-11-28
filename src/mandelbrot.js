import Rx from 'rxjs/Rx';
import MyWorker from 'worker-loader!./algorithm.js';

const mainCanvas = document.getElementById('mandel');
const mainCanvasContext = mainCanvas.getContext('2d');
const worker = new MyWorker();

const ZOOMFACTOR = 10.0;
const MAXFRAMES = 14;

const frames = Array(MAXFRAMES).fill(null);
let CURRENT_FRAME_NUMBER = 0;

let zoomSequenceActive = false;

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

function inverseInterpolateX(params, x) {
    //   x = x1 + (offsetX / width) * (x2 - x1) ergo
    return params.width * (x - params.x1) / (params.x2 - params.x1);
}

function inverseInterpolateY(params, y) {
    return params.height * (y - params.y1) / (params.y2 - params.y1);
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

function updateFrame(fractal) {
    let frame = frames[fractal.frameNumber] = {
        canvas: document.createElement('canvas'),
        params: {
            frameNumber: fractal.frameNumber,
            top: fractal.top, left: fractal.left,
            x1: fractal.x1, y1: fractal.y1, x2: fractal.x2, y2: fractal.y2,
            width: fractal.width, height: fractal.height,
            paletteIndex: fractal.paletteIndex,
            maxIters: fractal.maxIters
        }
    };
    const params = frame.params;
    frame.canvas.width = params.width;
    frame.canvas.height = params.height;
    const frameCanvasContext = frame.canvas.getContext('2d');
    const imageData = frameCanvasContext.createImageData(params.width, params.height);
    imageData.data.set(fractal.pixelArray);
    frameCanvasContext.putImageData(imageData, params.left, params.top);
    if (fractal.done) {
        const afterzoom = require('../audio/afterzoom.mp3');
        console.log("playing "+afterzoom);
        new Audio(afterzoom).play();
    }
    mainCanvasContext.drawImage(frame.canvas, 0, 0, frame.params.width, frame.params.height);
    CURRENT_FRAME_NUMBER = params.frameNumber;
    console.log("done: "+fractal.done+", maxIters: "+fractal.maxIters);
}

function worker$(params) {
    worker.postMessage(params);
    return Rx.Observable.fromEvent(worker, 'message')
        .map(event => event.data)
        .takeWhile(results => params.frameNumber === results.frameNumber);
}

function render(params) {
    worker$(params).subscribe(updateFrame);
}

//worker.addEventListener('message', (e) => paint(e.data));

function playCars() {
    if (Math.random() < 0.8) {
        new Audio('../audio/cars1.mp3').play();
    } else {
        new Audio('../audio/cars2.mp3').play();
    }
    setTimeout(playCars, Math.random() * 3000 + 3000);
}
setTimeout(playCars, 0);

Rx.Observable.interval(200).subscribe(e=> {
    if (!zoomSequenceActive) {
        let frame = frames[CURRENT_FRAME_NUMBER];
        if (frame !== null) {
            mainCanvasContext.drawImage(frame.canvas, 0, 0, frame.params.width, frame.params.height);
        }
    }
});

let params = {
    frameNumber: 0,
    top: 0,
    left: 0,
    x1: -2,
    y1: -1.15,
    x2: 1.0,
    y2: 1.15,
    width: mainCanvas.width,
    height: mainCanvas.height,
    paletteIndex: Math.floor(100 * Math.random()),
};

render(params);


Rx.Observable.fromEvent(mainCanvas, 'click').debounceTime(500).subscribe(e => {
    e.preventDefault();
    if (zoomSequenceActive) {
        return;
    }
    engageZoomSequence(e);
});

function engageZoomSequence(e) {

    zoomSequenceActive = false; // turn back on to true later...
    const [offsetX, offsetY] = mouseCoords(e);
    let frame = frames[CURRENT_FRAME_NUMBER]; // before CURRENT_FRAME_NUMBER gets updated...
    params = Object.assign({}, params, interpolateZoomRect(params, offsetX, offsetY), {frameNumber: params.frameNumber + 1});
    render(params);

    /*
    const callbacks = Array(826);
    let cursor1 = 0, cursor2 = 0, cursor3 = 0, cursor4 = 0;
    callbacks[9] = callbacks[34] = callbacks[52] = callbacks[70] = callbacks[89] = callbacks[107] = callbacks[126] = callbacks[147] = function() {
        mainCanvasContext.drawImage(frame.canvas, 0, 0, frame.params.width, frame.params.height);
        //draw cross starting at center and moving to offsetX, offsetY using cursor1 as counter

    };
    callbacks[255] = callbacks[275] = callbacks[295] = callbacks[315] = callbacks[335] = callbacks[365] = callbacks[385] = callbacks[405] = function() {
        // draw rectangles starting on the outside and in to where interpolateZoomRect is, using cursor2 as a counter
    };
    callbacks[520] = callbacks[536] = callbacks[552] = callbacks[568] = callbacks[585] = function() {
        // blink the smallest rectangle
    };
    callbacks[600] = callbacks[625] = callbacks[650] = callbacks[675] = callbacks[700] = callbacks[725] = callbacks[750] = callbacks[775] = callbacks[800] = callbacks[825] = function() {
       // show zoom in frames
    };
    const interval$ = Rx.Observable.interval(10).take(826).subscribe(e=> {
        if (callbacks[e]) {
            callbacks[e];
        }
    });
    */

}




Rx.Observable.fromEvent(mainCanvas, 'mouseout').subscribe(e => {
//    console.log('mouseout');
});

Rx.Observable.fromEvent(mainCanvas, 'mousemove').subscribe(e => {
    e.preventDefault();
    let [offsetX, offsetY] = mouseCoords(e);
//    console.log('mousemove('+offsetX+", "+offsetY+"):  x="+interpolateX(frames[frameNumber].params, offsetX) + ", y="+interpolateY(frames[frameNumber].params, offsetY));
});


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
