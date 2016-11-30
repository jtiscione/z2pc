import Rx from 'rxjs/Rx';
import MyWorker from 'worker-loader!./algorithm.js';

import $ from 'jquery';

const FONT_NAME = 'WheatonCapitals-Regular';

let mainCanvas = null;

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

function mouseCoords(e, avoidEdges) {
    let offsetX = e.offsetX, offsetY = e.offsetY;
    const tgt = e.target || e.srcElement;
    if (!offsetX && !offsetY) {
        // Firefox...
        const rect = tgt.getBoundingClientRect();
        offsetX = e.clientX - rect.left,
            offsetY  = e.clientY - rect.top;
    }
    if (avoidEdges) {
        // move away from edges
        offsetX = Math.max(offsetX, tgt.width / 2 / ZOOMFACTOR);
        offsetX = Math.min(offsetX, tgt.width - (tgt.width / 2 / ZOOMFACTOR));
        offsetY = Math.max(offsetY, tgt.height / 2 / ZOOMFACTOR);
        offsetY = Math.min(offsetY, tgt.height - (tgt.height / 2 / ZOOMFACTOR));
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


function interpolateZoomBounds(params, offsetX, offsetY, zoom = ZOOMFACTOR) {

    const {x1, y1, x2, y2} = params;

    return {
        x1: interpolateX(params, offsetX, zoom) - (x2 - x1) / (2 * zoom),
        x2: interpolateX(params, offsetX, zoom) + (x2 - x1) / (2 * zoom),
        y1: interpolateY(params, offsetY, zoom) - (y2 - y1) / (2 * zoom),
        y2: interpolateY(params, offsetY, zoom) + (y2 - y1) / (2 * zoom),
    };
}

// Takes pixel coordinates, returns array of decreasing rectangles excluding entire canvas and including zoom box
function interpolateScreenClipRects(offsetX, offsetY, width, height, steps, zoom = ZOOMFACTOR) {
    const targetRect = {
        x: offsetX - width / (2 * zoom),
        y: offsetY - height / (2 * zoom),
        width: width / zoom,
        height: height / zoom,
    };

    const rects = Array(steps);
    for (let step = 0; step < steps; step++) {
        rects[step] = {
            x: targetRect.x * (step + 1) / steps,
            y: targetRect.y * (step + 1) / steps,
            width: width - (width - targetRect.width) * (step + 1) / steps,
            height: height - (height - targetRect.height) * (step + 1) / steps,
        }
    }
    return rects;
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
            document.fonts.load('10pt "WheatonCapitals-Regular"').then(console.log);
        }
        catch(e) {
            console.log(e);
        }
    }

    mainCanvas = $('#mandel')[0];
    playCars();

    // In default mode (not zoomSequenceActive): periodically repaint canvas plus other stuff if necessary
    Rx.Observable.interval(100).subscribe(e=> {
        if (!zoomSequenceActive) {
            let frame = frames[CURRENT_FRAME_NUMBER];
            if (frame !== null) {
                const mainCanvasContext = mainCanvas.getContext('2d');
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

        zoomSequenceActive = true; // turn back on to true later...
        mainCanvas.style.cursor = 'cursor';

        let [offsetX, offsetY] = mouseCoords(e, true);
        let frame = frames[CURRENT_FRAME_NUMBER]; // before CURRENT_FRAME_NUMBER gets updated...
        let width = frame.parameters.width, height = frame.parameters.height;

        const params = Object.assign({}, frame.parameters, interpolateZoomBounds(frame.parameters, offsetX, offsetY), {frameNumber: frame.parameters.frameNumber + 1});
        render(params);

        const mainCanvasContext = mainCanvas.getContext('2d');

        let eightRects = interpolateScreenClipRects(offsetX, offsetY, width, height, 8);
        let tenRects = interpolateScreenClipRects(offsetX, offsetY, width, height, 10);

        const cb = Array(777);

        cb[0] = function() {
            zoomSequence1.play();
        };
        let cursor1 = 0, cursor2 = 0, cursor3 = 0, cursor4 = 0;
        cb[9] = cb[34] = cb[52] = cb[70] = cb[89] = cb[107] = cb[126] = cb[147] = function() {
            mainCanvasContext.drawImage(frame.canvas, 0, 0, width, height);
            let centerX = width / 2, centerY = height / 2;
            if (Math.abs(centerX - offsetX) < 50) {
                centerX = (offsetX + 100) % width;
            }
            if (Math.abs(centerY - offsetY) < 50) {
                centerY = (offsetY + 100) % height;
            }
            function drawCross(x, y, color) {
                mainCanvasContext.strokeStyle = color;
                mainCanvasContext.lineWidth = 1.0;
                mainCanvasContext.beginPath();
                mainCanvasContext.moveTo(x, 0);
                mainCanvasContext.lineTo(x, y - height / (2 * ZOOMFACTOR));
                mainCanvasContext.moveTo(x, y + height / (2 * ZOOMFACTOR));
                mainCanvasContext.lineTo(x, height - 1);
                mainCanvasContext.moveTo(0, y);
                mainCanvasContext.lineTo(x - width / (2 * ZOOMFACTOR), y);
                mainCanvasContext.moveTo(x + width / (2 * ZOOMFACTOR), y);
                mainCanvasContext.lineTo(width - 1, y);
                mainCanvasContext.stroke();
            }
            drawCross(centerX + (cursor1 / 7) * (offsetX - centerX),
                        centerY + (cursor1 / 7) * (offsetY - centerY),
                        'rgba(255,255,255,255');
            if (cursor1 < 7) {
                for (let prior = cursor1 - 1, alpha = 255; prior >= Math.max(cursor1 - 4); prior--) {
                    alpha >>= 2;
                    drawCross(  centerX + (prior / 7) * (offsetX - centerX),
                        centerY + (prior / 7) * (offsetY - centerY),
                        `rgba(255,255,255,${alpha})`);
                }
            }
            cursor1++;
        };
        cb[235] = cb[255] = cb[275] = cb[295] = cb[315] = cb[335] = cb[355] = cb[375] = function() {
            mainCanvasContext.drawImage(frame.canvas, 0, 0, width, height);
            // draw rectangles starting on the outside and in to where interpolateZoomRect is, using cursor2 as a counter
            mainCanvasContext.strokeStyle = '#FFFFFF';
            mainCanvasContext.lineWidth = 2;
            const rect = eightRects[cursor2];
            mainCanvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
            if (cursor2 < 7) {
                for (let prior = cursor2 - 1, alpha = 255; prior >= Math.max(0, cursor2 - 4); prior--) {
                    alpha >>= 2;
                    const rect = eightRects[prior];
                    mainCanvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
                }
            }
            cursor2++;
        };
        cb[480] = cb[490] = cb[496] = cb[506] = cb[522] = cb[532] = cb[538] = cb[548] = cb[565] = function() {
            // blink the smallest rectangle
            const rect = [...eightRects].pop();
            if (cursor3 % 2 == 0) {
                mainCanvasContext.strokeStyle = '#09f5ff';
            } else {
                mainCanvasContext.strokeStyle = 'white';
            }
            mainCanvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
            cursor3++;
        };
        cb[550] = cb[575] = cb[600] = cb[625] = cb[650] = cb[675] = cb[700] = cb[725] = cb[750] = cb[775] = function() {
            // show exterior expanding
            const rect = tenRects[cursor4];
            mainCanvasContext.drawImage(frame.canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
            const nextFrame = frames[frame.parameters.frameNumber + 1];
            if (nextFrame) {
                const innerX = offsetX - width / (2 * ZOOMFACTOR) - rect.x;
                const innerY = offsetY - height / (2 * ZOOMFACTOR) - rect.y;
                const embeddedRect = {
                    x: innerX * width / rect.width,
                    y: innerY * height / rect.height,
                    width: (width / ZOOMFACTOR) * width / rect.width,
                    height: (height / ZOOMFACTOR) * height / rect.height
                };
                mainCanvasContext.strokeStyle = 'white';
                mainCanvasContext.strokeRect(embeddedRect.x, embeddedRect.y, embeddedRect.width, embeddedRect.height);
                mainCanvasContext.drawImage(nextFrame.canvas, 0, 0, width, height,
                    embeddedRect.x, embeddedRect.y, embeddedRect.width, embeddedRect.height);

            }
            cursor4++;
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
        let [offsetX, offsetY] = mouseCoords(e, false);
        hoverX = offsetX;
        hoverY = offsetY;
    });
});
