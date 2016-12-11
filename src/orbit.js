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
        return this.height * (y - FIXED_Y1) / (FIXED_Y2 - FIXED_Y1);
        //return this.height * (1 - (y - FIXED_Y1) / (FIXED_Y2 - FIXED_Y1));
    }

    paint() {

        if (this.backgroundImageData) {
            this.context.putImageData(this.backgroundImageData, 0, 0);
        }

        // Draw a cross on the canvas
        const context = this.context, w = this.width, h = this.height;
        context.strokeStyle = 'gray';
        context.moveTo(w / 2, 0);
        context.lineTo(w / 2, h - 1);
        context.stroke();
        context.moveTo(0, h / 2);
        context.lineTo(w - 1, h / 2);
        context.stroke();
        // Draw an escape circle
        context.strokeStyle = 'white';
        context.strokeWidth = '2.0';
        if (context.ellipse) {
            context.beginPath();
            context.ellipse(w / 2, h / 2, (2.0 / FIXED_X2) * (w / 2), (2.0 / FIXED_Y2) * (h / 2), 0, 0, 2 * Math.PI);
            context.stroke();
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
                                                // Draw at most 100 yellow points starting from cx, cy continuing to mu
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
        this.context.strokeStyle = 'blue';
        this.context.strokeWidth = 1.0;
        for (let j = 0; j < mu; j++) {
            let xval = xvals[j];
            let yval = yvals[j];
            let pixelX = this._pixelCoordinateX(xval);
            let pixelY = this._pixelCoordinateY(yval);
            if (pixelX >= 0 && pixelX <= this.width && pixelY >= 0 && pixelY <= this.height) { // sanity check
                if (prevX === null || prevY === null) {
                    this.context.moveTo(pixelX, pixelY);
                } else {
                    this.context.lineTo(pixelX, pixelY);
                }
                prevX = pixelX;
                prevY = pixelY;
            }
        }
        this.context.stroke();

        this.context.strokeStyle = 'red';
        for (let j = mu; j < lambda; j++) {
            let xval = xvals[j];
            let yval = yvals[j];
            let pixelX = this._pixelCoordinateX(xval);
            let pixelY = this._pixelCoordinateY(yval);
            if (pixelX >= 0 && pixelX <= this.width && pixelY >= 0 && pixelY <= this.height) { // sanity check
                if (prevX === null || prevY === null) {
                    this.context.moveTo(pixelX, pixelY);
                } else {
                    this.context.lineTo(pixelX, pixelY);
                }
                prevX = pixelX;
                prevY = pixelY;
            }
        }
        this.context.stroke();
    }
}
//
// var CONTEXT_PATH = "mandel";
//
// var DEFAULT_IMAGE_WIDTH = 512;
// var DEFAULT_IMAGE_HEIGHT = 384;
//
// var ITERATOR_DISPLAY_WIDTH = 384;
// var ITERATOR_DISPLAY_HEIGHT = 384;
//
// var cenx = -0.75;
// var ceny = 0.0;
//
// var mag = 1.0;
// var maxIters = 4096;
// var seed = 0;
// var clientIdentifier = 0;
//
// var lastCoords = null;
//
// function linkRender(cx, cy, mg, mxitrs, sd) {
//     cenx = cx;
//     ceny = cy;
//     mag = mg;
//     maxIters = mxitrs;
//     seed = sd;
//     render();
// }
//
// function render() {
//     if (clientIdentifier == 0) {
//         clientIdentifier = Math.round (2147483648 * Math.random());
//     }
//     if (seed == 0) {
// //		seed = 1315502502;
// //		seed = 591333997;
//         seed = 1236650533;
//     }
//     document.getElementById('mandelbrot').src = "/"+CONTEXT_PATH+"/mandel?cid="+clientIdentifier+"&w="+DEFAULT_IMAGE_WIDTH+"&h="+DEFAULT_IMAGE_HEIGHT+"&cen="+cenx+","+ceny+"&mag="+mag+"&maxIters="+maxIters+"&seed="+seed;
//     updateLabels();
//     document.getElementById('mandelbrot').style.display = "none";
//     document.getElementById('pleasewait').style.display = "table-cell";
//     document.getElementById('overzoom').style.display = "none";
// }
//
// function render_complete() {
//     document.getElementById('mandelbrot').style.display = "table-cell";
//     document.getElementById('pleasewait').style.display = "none";
//     document.getElementById('overzoom').style.display = "none";
// }
//
// function overzoom_screen() {
//     document.getElementById('mandelbrot').style.display = "none";
//     document.getElementById('pleasewait').style.display = "none";
//     document.getElementById('overzoom').style.display = "table-cell";
// }
//
// function mouseOffPic(e) {
//     lastCoords = null;
// }
//
// function mouseOverPic(e) {
//     updateHoverLabels(e);
// }
//
// function mouseDownPic(e) {
//     if (e.button != 2) {
//         var c = coords(e);
//         lastCoords = c;
//     }
// }
//
// function mouseUpPic(e) {
//     if (e.button != 2) {
//         var c = coords(e);
//         cenx = floatXFromPixelX(c.x);
//         ceny = floatYFromPixelY(c.y);
//         lastCoords = null;
//         zoomIn();
//     }
// }
//
// function newColorMap() {
//     seed = Math.floor(2147483648 * Math.random());
//     render();
// }
//
// function reset() {
//     cenx = -0.75;
//     ceny = 0.0;
//     mag = 1.0;
//     maxIters = 4096;
//     render();
//     // var alternator can be left alone
// }
//
// function updateLabels() {
//     document.getElementById("cenx").innerHTML = cenx;
//     document.getElementById("ceny").innerHTML = ceny;
//     document.getElementById("magn").innerHTML = "Magnification: " + mag + " X";
//     document.getElementById("maxIters").innerHTML = "Max iterations: " + maxIters;
// }
//
// function updateHoverLabels(e) {
//     var c = coords(e);
//     var posx = c.x;
//     var posy = c.y;
//     var x = floatXFromPixelX(posx);
//     var y = floatYFromPixelY(posy);
//     var label;
//     label = document.getElementById("hoverX");
//     label.innerHTML = x;
//     label = document.getElementById("hoverY")
//     label.innerHTML = y;
//     label = document.getElementById("escapeIters");
//     var escapeIters = escapeIterations(x,y);
//     if (escapeIters == null) {
//         escapeIters = "&gt;"+maxIters;
//     }
//     label.innerHTML = "Escape iterations: " + escapeIters;
//     label = document.getElementById("orbitalPeriod");
//     var period = attractiveCycle(x, y);
//     if (period == null) {
//         label.innerHTML = '';
//     } else {
//         label.innerHTML = period;
//     }
// }
//
// var alternator = 0;
//
// function zoomIn() {
//     alternator++;
//     if (alternator % 2 == 0) {
//         mag *= 5;
//     } else {
//         mag *= 2;
//     }
//     mag = Math.floor(mag);
//     if (mag == 0.0) {
//         mag = 1.0;
//     }
//     if (mag > 1E14) {
//         mag = 1E14;
//         overzoom_screen();
//     } else {
//         render();
//     }
// }
//
// function zoomFarIn() {
//     if (mag > 1E14) {
//         mag = 1E14;
//         overzoom_screen();
//         return;
//     }
//     if (mag = 1E13) {
//         mag *= 10;
//     } else if (mag >= 1E10) {
//         mag *= 100;
//     } else if (mag >= 1E7) {
//         mag *= 1000;
//     } else if (mag >= 1E4) {
//         mag *= 10000;
//     } else {
//         mag *= 100000;
//     }
//     render();
// }
//
// function zoomOut() {
//     alternator--;
//     if (alternator % 2 == 0) {
//         mag /= 5;
//     } else {
//         mag /= 2;
//     }
//     mag = Math.floor(mag);
//     if (mag <= 1.0) {
//         mag = 1.0;
//     }
//     render();
// }
//
// function zoomFarOut() {
//     if (mag > 10000) {
//         mag /= 1000;
//     } else if (mag > 1000) {
//         mag /= 100;
//     } else if (mag > 100) {
//         mag /= 10;
//     } else if (mag > 10) {
//         mag = 10;
//     } else {
//         mag = 1;
//     }
//     render();
// }
//
// function pan(dx, dy) {
//     if (dx) {
//         cenx = cenx + (dx / mag);
//     }
//     if (dy) {
//         ceny = ceny + (dy / mag);
//     }
//     render();
// }
//
// function increaseMaxIters() {
//     maxIters *= 2;
//     if (maxIters >= 32768) {
//         maxIters = 32000;
//     }
//     render();
// }
//
//
// function decreaseMaxIters() {
//     if (maxIters >= 32000) {
//         maxIters = 16384;
//         render();
//         return;
//     }
//     if (maxIters <= 2) {
//         return;
//     }
//     maxIters /= 2;
//     render();
// }
//
// function coords(e) {
//     var coords = { x: 0, y: 0};
//     var posx = 0;
//     var posy = 0;
//     if (!e) {
//         var e = window.event;
//         posx = e.offsetX;
//         posy = e.offsetY;
//     } else if (e.offsetX && e.offsetY) {
//         posx = e.offsetX;
//         posy = e.offsetY;
//     } else {
//         if (e.pageX || e.pageY) 	{
//             posx = e.pageX;
//             posy = e.pageY;
//         }
//         else if (e.clientX || e.clientY) 	{
//             posx = e.clientX + document.body.scrollLeft
//                 + document.documentElement.scrollLeft;
//             posy = e.clientY + document.body.scrollTop
//                 + document.documentElement.scrollTop;
//         }
//
//         // posx and posy contain the mouse position relative to the document
//
//         var Element = e.target;
//         var CalculatedTotalOffsetLeft = 0;
//         var CalculatedTotalOffsetTop = 0 ;
//
//         while (Element.offsetParent)
//         {
//             CalculatedTotalOffsetLeft += Element.offsetLeft;
//             CalculatedTotalOffsetTop += Element.offsetTop;
//             Element = Element.offsetParent ;
//         }
//
//         posx -= CalculatedTotalOffsetLeft;
//         posy -= CalculatedTotalOffsetTop;
//
//     }
//     coords.x = posx;
//     coords.y = posy;
//     return coords;
// }
//
// function prettyRound(x) {
// //	return x;
//     var digits = (' ' + mag).length;
//     return parseFloat(x.toFixed(digits));
// }
// function indicatorPixelXFromFloatX(floatX, pixelWidthRange) {
//     return Math.round((pixelWidthRange >> 1 ) + (floatX * pixelWidthRange / 6.0));
// }
//
// function indicatorPixelYFromFloatY(floatY, pixelHeightRange) {
//     return Math.round((pixelHeightRange >> 1) - (floatY * pixelHeightRange / 6.0));
// }
//
// function floatXFromPixelX(pixelX) {
//     var rawx = cenx +  (4.0 / (DEFAULT_IMAGE_WIDTH * mag)) * (pixelX - (DEFAULT_IMAGE_WIDTH >> 1));
//     return prettyRound(rawx);
// }
//
// function floatYFromPixelY(pixelY) {
//     var rawy = ceny -  (4.0 / (DEFAULT_IMAGE_HEIGHT * mag)) * (pixelY - (DEFAULT_IMAGE_HEIGHT >> 1)) / 1.3;
//     return prettyRound(rawy);
// }
// /*
//  function pixelXFromFloatX(floatX, pixelWidthRange) {
//  return Math.round(  (pixelWidthRange >> 1 ) + (floatX - cenx) / (4.0 / (pixelWidthRange * mag))  );
//  }
//
//  function pixelYFromFloatY(floatY, pixelHeightRange) {
//  return Math.round(  (pixelHeightRange >> 1) -  1.3 *  (floatY - ceny) / (4.0 / (pixelHeightRange * mag))  );
//  }
//  */
//
//
// function attractiveCycle(cx, cy) {
//
//     replaceDIV();
//     drawCross(document.getElementById("crossDiv"), cx, cy, 0);
//
//     var xvals = new Array();
//     var yvals = new Array();
//     var arraySize = xvals.length;
//     var count = 0;
//     var x = 0; // 0 and not cx, so that cx is first elem of xvals
//     var y = 0; // 0 and not cy, so that cy is first elem of yvals
//     var epsilon = 0.000001 / mag;
//     var loose_epsilon = 0.001 / mag;
//     var i;
//     for (i = 0; i < maxIters; i++) {
//         var xx = x * x;
//         var yy = y * y;
//         if (xx + yy > 4.0) {
//             // The iterations escape.
//             plotPoints(xvals, yvals, 0, i, 1, 100); // 100 is the cap
//             return "Periodicity: N/A (diverges)";
//             //pseudoAttractiveCycle(xvals, yvals);
//         }
//         var xy = x * y;
//         x = xx - yy + cx;
//         y = xy + xy + cy;
//         xvals[i] = x;
//         yvals[i] = y;
//         if ((i & 0x01) == 0) {
//             var tortoiseIndex = i >> 1;
//             var xdiff = x - xvals[tortoiseIndex];
//             if (xdiff < epsilon && xdiff > -epsilon) {
//                 var ydiff = y - yvals[tortoiseIndex];
//                 if (ydiff < epsilon && ydiff > -epsilon) {
//                     // i and tortoiseIndex are equidistant from
//                     // the start of a cycle!
//                     var v = i - tortoiseIndex; // == tortoiseIndex
//                     // v is a multiple of lambda
//                     // Find the position mu of the first repeating
//                     // sequence of length v
//                     var mu;
//                     for (mu = 0; mu + v < i; mu++) {
//                         xdiff = xvals[mu+v] - xvals[mu];
//                         if (xdiff < epsilon && xdiff > -epsilon) {
//                             ydiff = yvals[mu+v] - yvals[mu];
//                             if (ydiff < epsilon && ydiff > -epsilon) {
//                                 // Found mu!
//                                 // March forward from mu until it is reached again
//                                 var lambda;
//                                 for (lambda=1; lambda <= v; lambda++) {
//                                     xdiff = xvals[mu+lambda] - xvals[mu];
//                                     if (xdiff < loose_epsilon && xdiff > -loose_epsilon) {
//                                         ydiff = yvals[mu+lambda] - yvals[mu];
//                                         if (ydiff < loose_epsilon && ydiff > -loose_epsilon) {
//                                             // Draw at most 100 yellow points starting
//                                             // from cx, cy continuing to mu
//                                             plotPoints(xvals, yvals, 0, mu, 1, 100);
//                                             // Draw the orbit itself in red
//                                             plotPoints(xvals, yvals, mu, lambda, 2, 100);
//                                             return "Periodicity:" + lambda;
//                                         } // ydiff
//                                     } //xdiff
//                                 } // lambda loop
//                             }  // ydiff
//                         } // xdiff
//                     } // mu loop
//                 } // ydiff
//             } // xdiff
//         } // if i is even
//     } // closes outer for loop
//
//     return "Periodicity: ";
// }
//
// function replaceDIV() {
//     var crossDiv = document.getElementById("crossDiv");
//     var prt1 = crossDiv.cloneNode(false);
//     crossDiv.parentNode.replaceChild(prt1, crossDiv);
//     crossDiv = prt1;
//     crossDiv.id = "crossDiv";
// }
//
// function plotPoints(xvals, yvals, offset, length, crosstype, cap) {
//
//     var crossDiv = document.getElementById("crossDiv");
//     var threshold  = 1.0;
//     if (length > cap) {
//         threshold = cap / length;
//     }
//     var j;
//     for (j=0; j<length; j++) {
//         if (j > 0 && (j < length-1) && threshold < 1.0 && Math.random() > threshold) {
//             continue;
//         }
//         var xval = xvals[offset+j];
//         var yval = yvals[offset+j];
//         drawCross(crossDiv, xval, yval, crosstype);
//     }
// }
//
// function drawCross(crossDiv, floatX, floatY, pixelType) {
//     var pixelX = indicatorPixelXFromFloatX(floatX, ITERATOR_DISPLAY_WIDTH);
//     var pixelY = indicatorPixelYFromFloatY(floatY, ITERATOR_DISPLAY_HEIGHT);
//     if (pixelX >= 0 && pixelX < ITERATOR_DISPLAY_WIDTH) {
//         if (pixelY >= 0 && pixelY < ITERATOR_DISPLAY_HEIGHT) {
//             var crossImg = document.createElement("img");
//             if (pixelType == 0) {
//                 // green cross
//                 pixelX -= 8;
//                 pixelY -= 8;
//                 crossImg.src = "img/pointer_cross.png";
//                 crossImg.setAttribute("width", 16);
//                 crossImg.setAttribute("height", 16);
//             } else if (pixelType == 1) {
//                 // yellow cross
//                 pixelX -= 4;
//                 pixelY -= 4;
//                 crossImg.src = "img/cross_8.png";
//                 crossImg.setAttribute("width", 8);
//                 crossImg.setAttribute("height", 8);
//             } else if (pixelType == 2) {
//                 // red cross
//                 pixelX -= 4;
//                 pixelY -= 4;
//                 crossImg.src = "img/redcross_8.png";
//                 crossImg.setAttribute("width", 8);
//                 crossImg.setAttribute("height", 8);
//             }
//             if (crossImg) {
//                 if (crossImg.style) {
//                     crossImg.style.position='absolute';
//                     crossImg.style.visibility='visible';
//                     crossImg.style.top = "" + pixelY + "px";
//                     crossImg.style.left = "" + pixelX + "px";
//                     crossImg.style.posTop = pixelY;
//                     crossImg.style.posLeft = pixelX;
//                     crossImg.style.opacity = 0.6;
//                     crossImg.style.filter = "alpha(opacity=60)";
//                     crossDiv.appendChild(crossImg);
//                 }
//             }
//         }
//     }
// }
//
// function indicatorPixelXFromFloatX(floatX, pixelWidthRange) {
//     return Math.round((pixelWidthRange >> 1 ) + (floatX * pixelWidthRange / 6.0));
// }
//
// function indicatorPixelYFromFloatY(floatY, pixelHeightRange) {
//     return Math.round((pixelHeightRange >> 1) - (floatY * pixelHeightRange / 6.0));
// }
//
// function editCenxStart() {
//     var oldlbl = document.getElementById('ceny');
//     var oldinp = document.getElementById('cenyEditor');
//     oldlbl.style.display = "inline";
//     oldinp.style.display = "none";
//
//     var lbl = document.getElementById('cenx');
//     var inp = document.getElementById('cenxEditor');
//     inp.value = lbl.text;
//     lbl.style.display = 'none';
//     inp.style.display = 'inline';
//     inp.value = lbl.innerHTML;
//     inp.select();
// }
//
// function editCenxCommit() {
//     var lbl = document.getElementById('cenx');
//     var inp = document.getElementById('cenxEditor');
//     inp.style.display = "none";
//     lbl.style.display = "inline";
//     var x = parseFloat(inp.value);
//     if (x != NaN) {
//         cenx = x;
//         render();
//     }
// }
// function editCenyStart() {
//     // turn the other one off
//     var oldlbl = document.getElementById('cenx');
//     var oldinp = document.getElementById('cenxEditor');
//     oldlbl.style.display = "inline";
//     oldinp.style.display = "none";
//
//     var lbl = document.getElementById('ceny');
//     var inp = document.getElementById('cenyEditor');
//     inp.value = lbl.text;
//     lbl.style.display = 'none';
//     inp.style.display = 'inline';
//     inp.value = lbl.innerHTML;
//     inp.select();
// }
//
// function editCenyCommit() {
//     var lbl = document.getElementById('ceny');
//     var inp = document.getElementById('cenyEditor');
//     inp.style.display = "none";
//     lbl.style.display = "inline";
//     lbl.txt = inp.value;
//     var y = parseFloat(inp.value);
//     if (y != NaN) {
//         ceny = y;
//         render();
//     }
// }
