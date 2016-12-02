import $ from 'jquery';
import Rx from 'rxjs/Rx';
import MyWorker from 'worker-loader!./algorithm.js';

const FONT_NAME = 'WheatonCapitals-Regular';
const BOTTOM_TEXT_MARGIN = 10;
const ZOOMFACTOR = 10.0;
const MAXFRAMES = 14;

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

class FractalComponent {

    constructor(canvas, initialParams) {

        this.canvas = canvas;
        const width = canvas.width;
        const height = canvas.height;

        this.worker = new MyWorker();
        this.listeners = {};

        this.frames = Array(MAXFRAMES).fill(null);
        this.CURRENT_FRAME_NUMBER = 0;

        this.zoomSequenceActive = false;

        this.hover = null;

        // In default mode (not zoomSequenceActive): periodically repaint canvas plus other stuff if necessary
        Rx.Observable.interval(100).subscribe(this.paintCurrentFrame.bind(this));


        Rx.Observable.fromEvent(this.canvas, 'mouseout').subscribe(this.clearHover.bind(this));
        Rx.Observable.fromEvent(this.canvas, 'mousemove').subscribe(this.updateHover.bind(this));
        Rx.Observable.fromEvent(this.canvas, 'click').debounceTime(500).subscribe(this.zoom.bind(this));

        if (!initialParams.width) {
            initialParams.width = width;
        }
        if (!initialParams.height) {
            initialParams.height = height;
        }
        this.startCalculating(initialParams);
    }

    on(type, listener) {
        if (!this.listeners.hasOwnProperty(type)) {
            this.listeners[type] = [];
        }
        this.listeners[type].push(listener);
        return this;
    }

    emit(type, ...args) {
        if (this.listeners.hasOwnProperty(type)) {
            this.listeners[type].forEach(lis => {lis(...args)});
        }
    }

    startCalculating(params) {
        console.log("1params: "+JSON.stringify(params));
        this.worker.postMessage(params);
        Rx.Observable.fromEvent(this.worker, 'message')
            .map(event => event.data)
            .takeWhile(function(response) {
                console.log("2params: "+JSON.stringify(params));
                return params.frameNumber === response.parameters.frameNumber;
            })
            .subscribe(this.updateFrame.bind(this));
    }

    updateFrame(response) {
        let {parameters, results} = response;
        let frame = this.frames[parameters.frameNumber] = {
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
        this.CURRENT_FRAME_NUMBER = frame.parameters.frameNumber;
    }

    paintCurrentFrame() {
        if (!this.zoomSequenceActive) {
            let frame = this.frames[this.CURRENT_FRAME_NUMBER];
            if (frame !== null) {
                const canvasContext = this.canvas.getContext('2d');
                canvasContext.drawImage(frame.canvas, 0, 0, frame.parameters.width, frame.parameters.height);
                if (this.hover !== null ) {
                    const {x, y} = this.hover;
                    canvasContext.font = `28px "${FONT_NAME}"`;
                    canvasContext.textAlign = 'start';
                    canvasContext.textBaseline = 'bottom';
                    canvasContext.strokeStyle = 'black';
                    canvasContext.fillStyle = 'white';
                    canvasContext.fillText(`x=${x}`, BOTTOM_TEXT_MARGIN, this.canvas.height - BOTTOM_TEXT_MARGIN);
                    canvasContext.strokeText(`x=${x}`, BOTTOM_TEXT_MARGIN, this.canvas.height - BOTTOM_TEXT_MARGIN);
                    canvasContext.fillText(`y=${y}`, BOTTOM_TEXT_MARGIN + (this.canvas.width / 2), this.canvas.height - BOTTOM_TEXT_MARGIN);
                    canvasContext.strokeText(`y=${y}`, BOTTOM_TEXT_MARGIN + (this.canvas.width / 2), this.canvas.height - BOTTOM_TEXT_MARGIN);
                }
            }
        }
    }

    updateHover(e) {
        e.preventDefault();
        let [offsetX, offsetY] = mouseCoords(e, false);
        const params = this.frames[this.CURRENT_FRAME_NUMBER].parameters;
        this.hover = {
            mouseX: offsetX,
            mouseY: offsetY,
            x: interpolateX(params, offsetX).toFixed(3 + this.CURRENT_FRAME_NUMBER),
            y: -interpolateY(params, offsetY).toFixed(3 + this.CURRENT_FRAME_NUMBER),
        };
        this.emit('hover', this.hover);
    }

    clearHover() {
        this.hover = null;
        this.emit('clearHover');
    }

    zoom(e) {
        e.preventDefault();
        if (this.zoomSequenceActive) {
            return;
        }

        this.zoomSequenceActive = true; // turn back on to true later...
        this.canvas.style.cursor = 'cursor';

        let [offsetX, offsetY] = mouseCoords(e, true);
        let frame = this.frames[this.CURRENT_FRAME_NUMBER]; // before CURRENT_FRAME_NUMBER gets updated...

        const params = Object.assign({}, frame.parameters, interpolateZoomBounds(frame.parameters, offsetX, offsetY), {frameNumber: frame.parameters.frameNumber + 1});

        this.emit('zoom', {
            mouseX: offsetX,
            mouseY: offsetY,
            x: interpolateX(frame.parameters, offsetX).toFixed(3 + this.CURRENT_FRAME_NUMBER),
            y: interpolateY(frame.parameters, offsetY).toFixed(3 + this.CURRENT_FRAME_NUMBER),
        });

        this.startCalculating(params);

        const canvasContext = this.canvas.getContext('2d');
        const width = this.canvas.width;
        const height = this.canvas.height;

        let eightRects = interpolateScreenClipRects(offsetX, offsetY, width, height, 8);
        let tenRects = interpolateScreenClipRects(offsetX, offsetY, width, height, 10);

        const cb = Array(777);

        cb[0] = function() {
            zoomSequence1.play();
        };
        let cursor1 = 0, cursor2 = 0, cursor3 = 0, cursor4 = 0;
        cb[9] = cb[34] = cb[52] = cb[70] = cb[89] = cb[107] = cb[126] = cb[147] = () => {
            canvasContext.drawImage(frame.canvas, 0, 0, width, height);
            let centerX = width / 2, centerY = height / 2;
            if (Math.abs(centerX - offsetX) < 50) {
                centerX = (offsetX + 100) % width;
            }
            if (Math.abs(centerY - offsetY) < 50) {
                centerY = (offsetY + 100) % height;
            }
            function drawCross(x, y, color) {
                canvasContext.strokeStyle = color;
                canvasContext.lineWidth = 1.0;
                canvasContext.beginPath();
                canvasContext.moveTo(x, 0);
                canvasContext.lineTo(x, y - height / (2 * ZOOMFACTOR));
                canvasContext.moveTo(x, y + height / (2 * ZOOMFACTOR));
                canvasContext.lineTo(x, height - 1);
                canvasContext.moveTo(0, y);
                canvasContext.lineTo(x - width / (2 * ZOOMFACTOR), y);
                canvasContext.moveTo(x + width / (2 * ZOOMFACTOR), y);
                canvasContext.lineTo(width - 1, y);
                canvasContext.stroke();
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
        cb[235] = cb[255] = cb[275] = cb[295] = cb[315] = cb[335] = cb[355] = cb[375] = () => {
            canvasContext.drawImage(frame.canvas, 0, 0, width, height);
            // draw rectangles starting on the outside and in to where interpolateZoomRect is, using cursor2 as a counter
            canvasContext.strokeStyle = '#FFFFFF';
            canvasContext.lineWidth = 2;
            const rect = eightRects[cursor2];
            canvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
            if (cursor2 < 7) {
                for (let prior = cursor2 - 1, alpha = 255; prior >= Math.max(0, cursor2 - 4); prior--) {
                    alpha >>= 2;
                    const rect = eightRects[prior];
                    canvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
                }
            }
            cursor2++;
        };
        cb[480] = cb[490] = cb[496] = cb[506] = cb[522] = cb[532] = cb[538] = cb[548] = cb[565] = () => {
            // blink the smallest rectangle
            const rect = [...eightRects].pop();
            if (cursor3 % 2 == 0) {
                canvasContext.strokeStyle = '#09f5ff';
            } else {
                canvasContext.strokeStyle = 'white';
            }
            canvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
            cursor3++;
        };
        cb[550] = cb[575] = cb[600] = cb[625] = cb[650] = cb[675] = cb[700] = cb[725] = cb[750] = cb[775] = () => {
            // show exterior expanding
            const rect = tenRects[cursor4];
            canvasContext.drawImage(frame.canvas, rect.x, rect.y, rect.width, rect.height, 0, 0, width, height);
            const nextFrame = this.frames[frame.parameters.frameNumber + 1];
            if (nextFrame) {
                const innerX = offsetX - width / (2 * ZOOMFACTOR) - rect.x;
                const innerY = offsetY - height / (2 * ZOOMFACTOR) - rect.y;
                const embeddedRect = {
                    x: innerX * width / rect.width,
                    y: innerY * height / rect.height,
                    width: (width / ZOOMFACTOR) * width / rect.width,
                    height: (height / ZOOMFACTOR) * height / rect.height
                };
                canvasContext.strokeStyle = 'white';
                canvasContext.strokeRect(embeddedRect.x, embeddedRect.y, embeddedRect.width, embeddedRect.height);
                canvasContext.drawImage(nextFrame.canvas, 0, 0, width, height,
                    embeddedRect.x, embeddedRect.y, embeddedRect.width, embeddedRect.height);

            }
            cursor4++;
        };
        cb[776] = () => {
            this.canvas.style.cursor = 'crosshair';
            this.zoomSequenceActive = false;
        };
        Rx.Observable.interval(10).take(cb.length).subscribe(e=> {
            if (cb[e]) {
                cb[e]();
            }
        });
    }
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

    setInterval(()=>{cars1.play()}, 4000);
    setInterval(()=>{cars2.play()}, 5000);

    const fc = new FractalComponent($('#mandel')[0],
        {
            frameNumber: 0,
            x1: -2,
            y1: -1.15,
            x2: 1.0,
            y2: 1.15,
            paletteIndex: Math.floor(100 * Math.random()),
        }
    );
});
