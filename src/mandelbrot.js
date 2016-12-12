import Rx from 'rxjs/Rx';
import MyWorker from 'worker-loader!./algorithm.js';

const FONT_NAME = 'WheatonCapitals-Regular';
const BOTTOM_TEXT_MARGIN = 10;
const ZOOMFACTOR = 10.0;
const MAXFRAMES = 14;

const zoomSequence1 = new Audio('audio/zoomSequence1.mp3');
const afterzoom = new Audio('audio/afterzoom.mp3');

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

export default class {

    constructor(canvas, interactive, initialParams) {

        this.canvas = canvas;

        this.worker = new MyWorker();
        this.listeners = {};

        this.frames = Array(MAXFRAMES).fill(null);
        this.CURRENT_FRAME_NUMBER = 0;

        this.hover = null;

        this.animationFrameTimestamp = null;

        this.animationFrameJobs = null;

        // In default mode (not zoomSequenceActive): periodically repaint canvas plus other stuff if necessary
        //Rx.Observable.interval(100).subscribe(this.paintCurrentFrame.bind(this));
        requestAnimationFrame(this.paintCurrentFrame.bind(this));

        if (interactive) {
            Rx.Observable.fromEvent(this.canvas, 'mouseout').subscribe(this.clearHover.bind(this));
            Rx.Observable.fromEvent(this.canvas, 'mousemove').subscribe(this.updateHover.bind(this));
            Rx.Observable.fromEvent(this.canvas, 'click').debounceTime(500).subscribe(this.zoom.bind(this));
        }

        if (initialParams) {
            this.startCalculating(initialParams);
        }
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
        if (!params.width) {
            params.width = this.canvas.width;
        }
        if (!params.height) {
            params.height = this.canvas.height;
        }
        this.worker.postMessage(params);
        Rx.Observable.fromEvent(this.worker, 'message')
            .map(event => event.data)
            .takeWhile(function(response) {
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
        /*
        if (frame.results.done) {
            afterzoom.play();
        }
        */
        this.CURRENT_FRAME_NUMBER = frame.parameters.frameNumber;
    }



    paintCurrentFrame(timestamp) {
        if (this.animationFrameTimestamp === timestamp) {
            return;
        }
        this.animationFrameTimestamp = timestamp;
        if (this.animationFrameJobs === null) {
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
        } else {
            if (this.animationFrameJobs.queue.length === 0) {
                this.canvas.style.cursor = 'crosshair';
                this.animationFrameJobs = null;
                this.emit('zoom-end');
            } else {
                const job = this.animationFrameJobs.queue[0];
                if (job.time <= (timestamp - this.animationFrameJobs.initialTimestamp)) {
                    this.animationFrameJobs.queue.shift();
                    job.callback();
                }
            }
        }
        requestAnimationFrame(this.paintCurrentFrame.bind(this));
    }

    updateHover(e) {
        e.preventDefault();
        let [offsetX, offsetY] = mouseCoords(e, false);
        if (this.frames[this.CURRENT_FRAME_NUMBER] === null) {
            return;
        }
        const params = this.frames[this.CURRENT_FRAME_NUMBER].parameters;
        this.hover = {
            mouseX: offsetX,
            mouseY: offsetY,
            x: +interpolateX(params, offsetX).toFixed(3 + this.CURRENT_FRAME_NUMBER),
            y: -interpolateY(params, offsetY).toFixed(3 + this.CURRENT_FRAME_NUMBER),
        };
        this.emit('update-hover', this.hover);
    }

    clearHover() {
        this.hover = null;
        this.emit('clear-hover');
    }

    reset() {
        this.frames = new Array(MAXFRAMES).fill(null);
        this.hover = null;
        this.CURRENT_FRAME_NUMBER = 0;
        this.animationFrameJobs = null;
        this.emit('reset');
    }

    zoom(e) {
        e.preventDefault();
        if (this.animationFrameJobs !== null) {
            return;
        }

        new Audio('audio/zoomSequence1.mp3').play();
        this.canvas.style.cursor = 'cursor';

        let [offsetX, offsetY] = mouseCoords(e, true);
        let frame = this.frames[this.CURRENT_FRAME_NUMBER]; // before CURRENT_FRAME_NUMBER gets updated...

        const params = Object.assign({}, frame.parameters, interpolateZoomBounds(frame.parameters, offsetX, offsetY), {frameNumber: frame.parameters.frameNumber + 1});

        this.emit('zoom-start', {
            mouseX: offsetX,
            mouseY: offsetY,
            x: interpolateX(frame.parameters, offsetX).toFixed(3 + this.CURRENT_FRAME_NUMBER),
            y: interpolateY(frame.parameters, offsetY).toFixed(3 + this.CURRENT_FRAME_NUMBER),
        });

        this.startCalculating(params);

        // Set up this.animationFrameJobs
        const canvasContext = this.canvas.getContext('2d');
        const width = this.canvas.width;
        const height = this.canvas.height;

        let eightRects = interpolateScreenClipRects(offsetX, offsetY, width, height, 8);
        let tenRects = interpolateScreenClipRects(offsetX, offsetY, width, height, 10);

        const queue = [];

        const sequence1Frames = [90, 340, 520, 700, 890, 1070, 1260, 1470];
        let cursor1 = 0;
        sequence1Frames.forEach(e => {
            queue.push({
                time: e,
                callback: () => {
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

                    drawCross(centerX + (cursor1 / (sequence1Frames.length - 1)) * (offsetX - centerX),
                        centerY + (cursor1 / (sequence1Frames.length - 1)) * (offsetY - centerY),
                        'rgba(255,255,255,255');
                    if (cursor1 < (sequence1Frames.length - 1)) {
                        for (let prior = cursor1 - 1, alpha = 255; prior >= Math.max(cursor1 - 4); prior--) {
                            alpha >>= 2;
                            drawCross(centerX + (prior / (sequence1Frames.length - 1)) * (offsetX - centerX),
                                    centerY + (prior / (sequence1Frames.length - 1)) * (offsetY - centerY),
                                    `rgba(255,255,255,${alpha})`);
                        }
                    }
                    cursor1++;
                }
            });
        });

        const sequence2Frames = [2350, 2550, 2750, 2950, 3150, 3350, 3550, 3750];
        let cursor2 = 0;
        sequence2Frames.forEach(e => {
            queue.push({
                time: e,
                callback: () => {
                    canvasContext.drawImage(frame.canvas, 0, 0, width, height);
                    // draw rectangles starting on the outside and in to where interpolateZoomRect is, using cursor2 as a counter
                    canvasContext.strokeStyle = '#FFFFFF';
                    canvasContext.lineWidth = 2;
                    const rect = eightRects[cursor2];
                    canvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
                    if (cursor2 < (sequence2Frames.length - 1)) {
                        for (let prior = cursor2 - 1, alpha = 255; prior >= Math.max(0, cursor2 - 4); prior--) {
                            alpha >>= 2;
                            const rect = eightRects[prior];
                            canvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
                        }
                    }
                    cursor2++;
                }
            });
        });

        const sequence3Frames = [4800, 4900, 4960, 5060, 5220, 5320, 5380, 5480, 5650];
        let cursor3 = 0;
        sequence3Frames.forEach(e => {
            queue.push({
                time: e,
                callback: () => {
                    // blink the smallest rectangle
                    const rect = [...eightRects].pop();
                    if (cursor3 % 2 == 0) {
                        canvasContext.strokeStyle = '#09f5ff';
                    } else {
                        canvasContext.strokeStyle = 'white';
                    }
                    canvasContext.strokeRect(rect.x, rect.y, rect.width, rect.height);
                    cursor3++;
                }
            })
        });

        const sequence4Frames = [5500, 5750, 6000, 6250, 6500, 6750, 7000, 7250, 7500, 7750];
        let cursor4 = 0;
        sequence4Frames.forEach(e => {
           queue.push({
               time: e,
               callback: () => {
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
               }
           });
        });


        this.animationFrameJobs = {
            initialTimestamp: this.animationFrameTimestamp,
            queue
        };

    }
}