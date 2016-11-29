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
const zoomSequence1 = new Audio('../audio/zoomSequence1.mp3');
const afterzoom = new Audio('../audio/afterzoom.mp3');
//const afterzoom = require('../audio/afterzoom.mp3');
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
        afterzoom.play();
    }
//    mainCanvasContext.drawImage(frame.canvas, 0, 0, frame.parameters.width, frame.parameters.height);
    CURRENT_FRAME_NUMBER = frame.parameters.frameNumber;
//    console.log("done: "+frame.results.done+", maxIters: "+frame.results.maxIters);
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
    setInterval(()=>{cars1.play()}, 4000);
    setInterval(()=>{cars2.play()}, 5000);
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
            console.log("acting normally...");
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
        } else {
            console.log("...suppressed...");
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

        zoomSequenceActive = true; // turn back on to true later...
        mainCanvas.style.cursor = 'wait';
        const [offsetX, offsetY] = mouseCoords(e);
        let frame = frames[CURRENT_FRAME_NUMBER]; // before CURRENT_FRAME_NUMBER gets updated...
        const params = Object.assign({}, frame.parameters, interpolateZoomRect(frame.parameters, offsetX, offsetY), {frameNumber: frame.parameters.frameNumber + 1});
        render(params);

        const cb = Array(777);

        cb[0] = function() {
            zoomSequence1.play();
        };
        let cursor1 = 0, cursor2 = 0, cursor3 = 0, cursor4 = 0;
        cb[9] = cb[34] = cb[52] = cb[70] = cb[89] = cb[107] = cb[126] = cb[147] = function() {
            mainCanvasContext.drawImage(frame.canvas, 0, 0, frame.parameters.width, frame.parameters.height);
            mainCanvasContext.strokeStyle = 'blue';
            mainCanvasContext.lineWidth = 1.0;
            const centerX = mainCanvas.width / 2, centerY = mainCanvas.height / 2;
            const currentX = centerX + (cursor1 / 7) * (offsetX - centerX);
            const currentY = centerY + (cursor1 / 7) * (offsetY - centerY);
            mainCanvasContext.beginPath();
            mainCanvasContext.moveTo(currentX, 0);
            mainCanvasContext.lineTo(currentX, mainCanvas.height - 1);
            mainCanvasContext.stroke();
            mainCanvasContext.beginPath();
            mainCanvasContext.moveTo(0, currentY);
            mainCanvasContext.lineTo(mainCanvas.width - 1, currentY);
            mainCanvasContext.stroke();
            cursor1++;
            console.log("beep: " + cursor1);
        };
        cb[235] = cb[255] = cb[275] = cb[295] = cb[315] = cb[345] = cb[365] = cb[385] = function() {
            // draw rectangles starting on the outside and in to where interpolateZoomRect is, using cursor2 as a counter
            cursor2++;
            console.log("rect: " + cursor2);
        };
        cb[480] = cb[496] = cb[522] = cb[538] = cb[565] = function() {
            // blink the smallest rectangle
            cursor3++;
            console.log("blink: " + cursor3);
        };
        cb[550] = cb[575] = cb[600] = cb[625] = cb[650] = cb[675] = cb[700] = cb[725] = cb[750] = cb[775] = function() {
           // show zoom in frames
           cursor4++;
           console.log("click: " + cursor4);
        };
        cb[776] = function() {
            mainCanvas.style.cursor = 'crosshair';
            zoomSequenceActive = false;
        };
        Rx.Observable.interval(10).take(cb.length).subscribe(e=> {
            if (cb[e]) {
                cb[e]();
            }
        });
    }




    Rx.Observable.fromEvent(mainCanvas, 'mouseout').subscribe(e => {
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
