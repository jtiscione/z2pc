import $ from 'jquery';
import MyWorker from 'worker-loader!./algorithm.js';

// Centered around zero:
const FIXED_X2 = 3.0, FIXED_Y2 = 3.0;
const FIXED_X1 = -FIXED_X2, FIXED_Y1 = -FIXED_Y2;
const MAX_ITERS = 65536;

function escapeIterations(cx, cy) {
    let x = cx;
    let y = cy;
    for (let i = 0; i < MAX_ITERS; i++) {
        let xx = x * x;
        let yy = y * y;
        if (xx + yy > 4.0) {
            return i;
        }
        let xy = x * y;
        x = xx - yy + cx;
        y = xy + xy + cy;
    }
    return null;
}

export default class {

    constructor(_canvas, _labelEscapeIters, _labelPeriodicity) {

        // DOM nodes
        this.canvas = _canvas;
        this.labelEscapeIters = _labelEscapeIters;
        this.labelPeriodicity = _labelPeriodicity;

        // Canvas context
        this.context = this.canvas.getContext('2d');

        // Canvas dimensions
        this.width = this.canvas.width;
        this.height = this.canvas.height;

        // currently hovered over point, fields {x, y, mouseX, mouseY}, defaults to null
        this.hover = null;

        // background image calculated once by a worker
        this.backgroundImageData = null;

        const worker = new MyWorker();
        worker.addEventListener('message', e => {
            this.backgroundImageData = this.context.createImageData(this.width, this.height);
            this.backgroundImageData.data.set(e.data.results.pixelArray);
            worker.terminate();
            requestAnimationFrame(this.paint.bind(this));
        });
        worker.postMessage({x1: FIXED_X1,
                            y1: FIXED_Y1,
                            x2: FIXED_X2,
                            y2: FIXED_Y2,
                            width: this.width,
                            height: this.height,
                            maxIters: 512,
                            paletteIndex: Math.floor(100 * Math.random())
                           });

    }

    updateHover(e) {
        this.hover = e;
        requestAnimationFrame(this.paint.bind(this));
    }

    clearHover() {
        this.hover = null;
        requestAnimationFrame(this.paint.bind(this));
    }

    _pixelCoordinateX(x) {
        return this.width * (x - FIXED_X1) / (FIXED_X2 - FIXED_X1);
    }

    _pixelCoordinateY(y) {
        //return this.height * (y - FIXED_Y1) / (FIXED_Y2 - FIXED_Y1);
        return this.height * (1 - (y - FIXED_Y1) / (FIXED_Y2 - FIXED_Y1));
    }

    paint() {

        if (this.backgroundImageData) {
            this.context.putImageData(this.backgroundImageData, 0, 0);
        }

        // Draw a cross on the canvas
        const w = this.width, h = this.height;
        this.context.beginPath();
        this.context.strokeStyle = 'gray';
        this.context.moveTo(w / 2, 0);
        this.context.lineTo(w / 2, h - 1);
        this.context.stroke();
        this.context.moveTo(0, h / 2);
        this.context.lineTo(w - 1, h / 2);
        this.context.stroke();
        // Draw an escape circle
        if (this.context.ellipse) {
            this.context.beginPath();
            this.context.strokeStyle = 'white';
            this.context.strokeWidth = '2.0';
            this.context.beginPath();
            this.context.ellipse(w / 2, h / 2, (2.0 / FIXED_X2) * (w / 2), (2.0 / FIXED_Y2) * (h / 2), 0, 0, 2 * Math.PI);
            this.context.stroke();
        }

        if (this.hover) {
            const {x, y} = this.hover;
            const escapeIters = escapeIterations(x, y);
            if (escapeIters === null) {
                this.labelEscapeIters.innerHTML = `Escape iterations: &gt;${MAX_ITERS}`;
            } else {
                this.labelEscapeIters.innerHTML = `Escape iterations: ${escapeIters}`;
            }
            let period = this._attractiveCycle(x, y);
            if (period === null) {
                this.labelPeriodicity.innerHTML = 'Periodicity: ?';
            } else {
                this.labelPeriodicity.innerHTML = `Periodicity: ${period}`;
            }
        } else {
            this.labelEscapeIters.innerHTML = '&nbsp;';
            this.labelPeriodicity.innerHTML = '&nbsp;';
        }
    }

    // Does the painting to the canvas, and returns periodicity or null
    _attractiveCycle(cx, cy) {

        const epsilon = 1E-13, loose_epsilon = 1E-10;

        const xvals = [], yvals = [];

        // cx will be first elem of xvals, cy first elem of yvals
        for (let i = 0, x = 0, y = 0; i < MAX_ITERS; i++) {
            let xx = x * x, yy = y * y;
            if (xx + yy > 4.0) {
                this._plotPath(xvals, yvals, i);
                return null; // Periodicity: N/A (diverges)
            }
            let xy = x * y;
            x = xx - yy + cx;
            y = xy + xy + cy;
            xvals.push(x);
            yvals.push(y);
            // Once every other iteration...
            if ((i % 0x01) === 0) {
                let tortoiseIndex = i >> 1;
                let xdiff = x - xvals[tortoiseIndex];
                if (xdiff < epsilon && xdiff > -epsilon) {
                    let ydiff = y - yvals[tortoiseIndex];
                    if (ydiff < epsilon && ydiff > -epsilon) {
                        // i and tortoiseIndex are equidistant from the start of a cycle!
                        let v = i - tortoiseIndex;
                        // v is a multiple of lambda
                        // Find the position mu of the first repeating sequence of length v
                        for (let mu = 0; mu + v < i; mu++) {
                            xdiff = xvals[mu + v] - xvals[mu];
                            if (xdiff < epsilon && xdiff > -epsilon) {
                                ydiff = yvals[mu + v] - yvals[mu];
                                if (ydiff < epsilon && ydiff > -epsilon) {
                                    // Found mu!
                                    // March forward from mu until it's reached again
                                    for (let lambda = 1; lambda <= v; lambda++) {
                                        xdiff = xvals[mu + lambda] - xvals[mu];
                                        if (xdiff < loose_epsilon && xdiff > -loose_epsilon) {
                                            ydiff = yvals[mu + lambda] - yvals[mu];
                                            if (ydiff < loose_epsilon && ydiff > -loose_epsilon) {
                                                this._plotPath(xvals, yvals, mu, lambda);
                                                return lambda; // Periodicity: lambda
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        return null; // Periodicity: unknown
    }

    _plotPath(xvals, yvals, mu, lambda = 0) {
        // Draw at most 100 yellow points starting from cx, cy continuing to mu
        let prevX = null, prevY = null;
        this.context.strokeWidth = 1.0;
        this.context.beginPath();
        this.context.strokeStyle = 'rgba(127, 127, 0, 127)';
        // Draw at most 20 yellow lines before moving on
        for (let j = 0; j < Math.min(mu, 20); j++) {
            let xval = xvals[j];
            let yval = yvals[j];
            let pixelX = this._pixelCoordinateX(xval);
            let pixelY = this._pixelCoordinateY(yval);
            if (pixelX >= 0 && pixelX <= this.width && pixelY >= 0 && pixelY <= this.height) { // sanity check
                if (prevX === null || prevY === null) {
                    this.context.moveTo(pixelX, pixelY);
                } else {
                    this.context.lineTo(pixelX, pixelY);
                    this.context.stroke();
                }
                prevX = pixelX;
                prevY = pixelY;
            } else {
                break;
            }
        }
        this.context.beginPath();

        prevX = prevY = null;
        this.context.strokeStyle = 'rgba(255, 0, 0, 127)';
        for (let j = mu; j < mu + lambda; j++) {
            let xval = xvals[j];
            let yval = yvals[j];
            let pixelX = this._pixelCoordinateX(xval);
            let pixelY = this._pixelCoordinateY(yval);
            if (pixelX >= 0 && pixelX <= this.width && pixelY >= 0 && pixelY <= this.height) { // sanity check
                if (prevX === null || prevY === null) {
                    this.context.moveTo(pixelX, pixelY);
                } else {
                    this.context.lineTo(pixelX, pixelY);
                    this.context.stroke();
                }
                prevX = pixelX;
                prevY = pixelY;
            } else {
                break;
            }
        }
    }
}
