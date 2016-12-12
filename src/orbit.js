import MyWorker from 'worker-loader!./algorithm.js';

const FONT_NAME = 'WheatonCapitals-Regular';
const BOTTOM_TEXT_MARGIN = 10;
const CROSSRADIUS = 5;

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

    constructor(_canvas) {

        // DOM nodes
        this.canvas = _canvas;

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
            requestAnimationFrame(this._paint.bind(this));
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
        requestAnimationFrame(this._paint.bind(this));
    }

    clearHover() {
        this.hover = null;
        requestAnimationFrame(this._paint.bind(this));
    }

    _pixelCoordinateX(x) {
        return this.width * (x - FIXED_X1) / (FIXED_X2 - FIXED_X1);
    }

    _pixelCoordinateY(y) {
        //return this.height * (y - FIXED_Y1) / (FIXED_Y2 - FIXED_Y1);
        return this.height * (1 - (y - FIXED_Y1) / (FIXED_Y2 - FIXED_Y1));
    }

    _paint() {
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
            this.context.font = `20px "${FONT_NAME}"`;
            this.context.textAlign = 'start';
            this.context.textBaseline = 'bottom';
            this.context.strokeStyle = 'black';
            this.context.fillStyle = 'white';
            let status = '';
            let period = this._attractiveCycle(x, y);
            if (period === null) {
                const escapeIters = escapeIterations(x, y);
                if (escapeIters === null) {
                    status = `ESCAPE ITERATIONS: &gt;${MAX_ITERS}`;
                } else {
                    status = `ESCAPE ITERATIONS: ${escapeIters}`;
                }
            } else {
                status = `PERIODICITY: ${period}`;
            }
            this.context.fillText(status, BOTTOM_TEXT_MARGIN, this.height - BOTTOM_TEXT_MARGIN);
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
        this.context.strokeStyle = 'rgba(127, 127, 0, 32)';
        // Draw at most 50 yellow lines before moving on
        for (let j = 0; j < Math.min(mu, 50); j++) {
            let xval = xvals[j];
            let yval = yvals[j];
            let pixelX = this._pixelCoordinateX(xval);
            let pixelY = this._pixelCoordinateY(yval);
            if (prevX === null || prevY === null) {
                this.context.moveTo(pixelX, pixelY);
            } else {
                this.context.lineTo(pixelX, pixelY);
                this.context.stroke();
            }
            prevX = pixelX;
            prevY = pixelY;
        }
        this.context.beginPath();

        prevX = prevY = null;
        this.context.strokeStyle = 'rgba(255, 0, 0, 32)';
        const crosspoints = [];
        for (let j = mu; j < mu + lambda; j++) {
            let xval = xvals[j];
            let yval = yvals[j];
            let pixelX = this._pixelCoordinateX(xval);
            let pixelY = this._pixelCoordinateY(yval);
            crosspoints.push({pixelX, pixelY});
            if (prevX === null || prevY === null) {
                this.context.moveTo(pixelX, pixelY);
            } else {
                this.context.lineTo(pixelX, pixelY);
                this.context.stroke();
            }
            prevX = pixelX;
            prevY = pixelY;
            if (j === mu + lambda - 1) {
                // draw one last line to complete the loop
                this.context.lineTo(this._pixelCoordinateX(xvals[mu]),
                                    this._pixelCoordinateY(yvals[mu]));
                this.context.stroke();
            }
        }

        crosspoints.forEach(e => {
            this.context.strokeStyle = 'red';
            this.context.beginPath();
            this.context.moveTo(e.pixelX - CROSSRADIUS, e.pixelY);
            this.context.lineTo(e.pixelX + CROSSRADIUS, e.pixelY);
            this.context.moveTo(e.pixelX, e.pixelY - CROSSRADIUS);
            this.context.lineTo(e.pixelX, e.pixelY + CROSSRADIUS);
            this.context.stroke();
        });
    }
}
