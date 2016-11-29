import Rx from 'rxjs/Rx';
import MyWorker from 'worker-loader!./algorithm.js';

import $ from 'jquery';

const FONT_NAME = 'WheatonCapitals-Regular';

const mainCanvas = document.getElementById('mandel');
const mainCanvasContext = mainCanvas.getContext('2d');
const worker = new MyWorker();

const ZOOMFACTOR = 10.0;
const MAXFRAMES = 14;

const frames = Array(MAXFRAMES).fill(null);
let CURRENT_FRAME_NUMBER = 0;

let zoomSequenceActive = false;

let hoverX = null, hoverY = null;

const cars1 = new Audio('../audio/cars1.mp3'), cars2 = new Audio('../audio/cars2.mp3');

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

function updateFrame(response) {
    let {parameters, results} = response;
    let frame = frames[parameters.frameNumber] = {
        canvas: document.createElement('canvas'),
        parameters,
        results
    };
    frame.canvas.width = frame.parameters.width;
    frame.canvas.height = frame.parameters.height;
    const frameCanvasContext = frame.canvas.getContext('2d');
    const imageData = frameCanvasContext.createImageData(frame.parameters.width, frame.parameters.height);
    imageData.data.set(frame.results.pixelArray);
    frameCanvasContext.putImageData(imageData, 0, 0);
    if (frame.results.done) {
        const afterzoom = require('../audio/afterzoom.mp3');
        console.log("playing "+afterzoom);
        new Audio(afterzoom).play();
    }
    mainCanvasContext.drawImage(frame.canvas, 0, 0, frame.parameters.width, frame.parameters.height);
    CURRENT_FRAME_NUMBER = frame.parameters.frameNumber;
    console.log("done: "+frame.results.done+", maxIters: "+frame.results.maxIters);
}

function worker$(params) {
    worker.postMessage(params);
    return Rx.Observable.fromEvent(worker, 'message')
        .map(event => event.data)
        .takeWhile(response => params.frameNumber === response.parameters.frameNumber);
}

function render(params) {
    worker$(params).subscribe(updateFrame);
}

//worker.addEventListener('message', (e) => paint(e.data));

function playCars() {
    if (Math.random() < 0.8) {
        cars1.play();
    } else {
        cars2.play();
    }
    setTimeout(playCars, Math.random() * 3000 + 3000);
}

$(function() {

    if (document.fonts.load) {
        try {
            document.fonts.load('10pt "WheatonCapitals-Regular"').then(x => console.log("Loaded: "+x));
        }
        catch(e) {
            console.log(e);
        }
    }
    setTimeout(playCars, 0);

    // In default mode (not zoomSequenceActive): periodically repaint canvas plus other stuff if necessary
    Rx.Observable.interval(100).subscribe(e=> {
        if (!zoomSequenceActive) {
            let frame = frames[CURRENT_FRAME_NUMBER];
            if (frame !== null) {
                mainCanvasContext.drawImage(frame.canvas, 0, 0, frame.parameters.width, frame.parameters.height);
                if (hoverX !== null && hoverY !== null) {
                    const x = interpolateX(frame.parameters, hoverX).toFixed(3 + CURRENT_FRAME_NUMBER);
                    const y = -interpolateY(frame.parameters, hoverY).toFixed(3 + CURRENT_FRAME_NUMBER);

                    mainCanvasContext.font = `28px "${FONT_NAME}"`;
                    mainCanvasContext.textAlign = 'start';
                    mainCanvasContext.textBaseline = 'bottom';
                    mainCanvasContext.strokeStyle = 'black';
                    mainCanvasContext.fillStyle = 'white';
                    mainCanvasContext.fillText(`x=${x}`, 10, mainCanvas.height - 10);
                    mainCanvasContext.strokeText(`x=${x}`, 10, mainCanvas.height - 10);
                    mainCanvasContext.fillText(`y=${y}`, 10 + (mainCanvas.width / 2), mainCanvas.height - 10);
                    mainCanvasContext.strokeText(`y=${y}`, 10 + (mainCanvas.width / 2), mainCanvas.height - 10);
                }
            }
        }
    });

    render({
        frameNumber: 0,
        x1: -2,
        y1: -1.15,
        x2: 1.0,
        y2: 1.15,
        width: mainCanvas.width,
        height: mainCanvas.height,
        paletteIndex: Math.floor(100 * Math.random()),
    });

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
        const params = Object.assign({}, frame.parameters, interpolateZoomRect(frame.parameters, offsetX, offsetY), {frameNumber: frame.parameters.frameNumber + 1});
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
        console.log('mouseout');
        hoverX = hoverY = null;
    });

    Rx.Observable.fromEvent(mainCanvas, 'mousemove').subscribe(e => {
        e.preventDefault();
        let [offsetX, offsetY] = mouseCoords(e);
        hoverX = offsetX;
        hoverY = offsetY;
    });
});

//paint(generateFractal(params));
