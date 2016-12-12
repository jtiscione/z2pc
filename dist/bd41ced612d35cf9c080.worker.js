/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "./";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	var _pixelfiller = __webpack_require__(2);
	
	var _pixelfiller2 = _interopRequireDefault(_pixelfiller);
	
	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
	
	var latestParameters = null;
	
	function generateFractal(parameters) {
	
	    latestParameters = parameters;
	    var juliaX = parameters.juliaX,
	        juliaY = parameters.juliaY,
	        x1 = parameters.x1,
	        y1 = parameters.y1,
	        x2 = parameters.x2,
	        y2 = parameters.y2,
	        width = parameters.width,
	        height = parameters.height,
	        paletteIndex = parameters.paletteIndex;
	
	    var xstep = (x2 - x1) / width,
	        ystep = (y2 - y1) / height;
	    var iterationCountArray = Array(width * height).fill(0.0);
	    var z_real_Array = Array(width * height).fill(0.0);
	    var z_imag_Array = Array(width * height).fill(0.0);
	    var pixelArray = new Uint8ClampedArray(4 * width * height);
	
	    var histogram = [];
	    var totalHits = 0;
	    var priorMaxIters = 0,
	        maxIters = 256;
	
	    var passCount = 0;
	
	    var loopIteration = function loopIteration() {
	
	        passCount++;
	        if (latestParameters !== parameters) {
	            return;
	        }
	
	        if (histogram.length < maxIters) {
	            histogram = histogram.concat(Array(maxIters - histogram.length).fill(0.0));
	        }
	
	        var julia = typeof juliaX === 'number' && typeof juliaY === 'number';
	
	        var hits = 0;
	
	        var rawIndex = 0;
	        for (var y = y1, i = 0; i < height; i++, y += ystep) {
	            for (var x = x1, j = 0; j < width; j++, x += xstep) {
	                var cx = x,
	                    cy = y;
	                if (julia) {
	                    cx = juliaX;
	                    cy = juliaY;
	                    if (passCount === 1) {
	                        z_real_Array[rawIndex] = x;
	                        z_imag_Array[rawIndex] = y;
	                    }
	                }
	                var zx_original = z_real_Array[rawIndex],
	                    zy_original = z_imag_Array[rawIndex];
	                var zx = zx_original,
	                    zy = zy_original;
	                var iterationCount = void 0;
	                // Any -1 values indicating periodicity are bypassed by the >= priorMaxIters check
	                for (iterationCount = iterationCountArray[rawIndex]; iterationCount >= priorMaxIters && iterationCount < maxIters; iterationCount++) {
	                    var _x = zx * zx - zy * zy;
	                    zy = 2 * zx * zy + cy;
	                    zx = _x + cx;
	                    if (zx * zx + zy * zy >= 4) {
	                        histogram[iterationCount]++;
	                        hits++;
	                        break;
	                    }
	                    if (zx === zx_original && zy === zy_original) {
	                        // detected periodicity- x and y are now known to be in the set
	                        iterationCount = -1;
	                        break;
	                    }
	                }
	                iterationCountArray[rawIndex] = iterationCount;
	                z_real_Array[rawIndex] = zx;
	                z_imag_Array[rawIndex] = zy;
	                rawIndex++;
	            }
	        }
	        priorMaxIters = maxIters;
	        totalHits += hits;
	
	        if (totalHits === 0) {
	            priorMaxIters = maxIters;
	            maxIters *= 8;
	            setTimeout(loopIteration, 5);
	            return;
	        }
	        (0, _pixelfiller2.default)(pixelArray, iterationCountArray, width, height, histogram, paletteIndex);
	
	        var done = hits < 1000 || maxIters >= 16384;
	        postMessage({
	            parameters: parameters,
	            results: {
	                iterationCountArray: iterationCountArray,
	                histogram: histogram,
	                pixelArray: pixelArray,
	                maxIters: maxIters,
	                done: done
	            }
	        });
	        if (!done) {
	            priorMaxIters = maxIters;
	            maxIters *= 2;
	            setTimeout(loopIteration, 5);
	        }
	    };
	    setTimeout(loopIteration, 5);
	}
	
	addEventListener('message', function (e) {
	    generateFractal(e.data);
	}, false);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	
	exports.default = function (histogram, paletteIndex) {
	    // Compute cumulativeHistogram
	    var total = histogram.reduce(function (a, b) {
	        return a + b;
	    }, 0);
	    var cumulativeHistogram = Array(histogram.length);
	    histogram.reduce(function (sum, currentValue, currentIndex) {
	        sum += currentValue / total;
	        cumulativeHistogram[currentIndex] = sum;
	        return sum;
	    }, 0);
	    var reds = Array(histogram.length),
	        greens = Array(histogram.length),
	        blues = Array(histogram.length);
	    var colormap = interpolate(palettes[paletteIndex]);
	    for (var i = 0; i < histogram.length; i++) {
	        var rgbCSS = colormap(cumulativeHistogram[i]);
	        var rgb = rgbCSS.match(/rgb\((\d+),(\d+),(\d+)\)/);
	        reds[i] = rgb[1];
	        greens[i] = rgb[2];
	        blues[i] = rgb[3];
	    }
	    return [reds, greens, blues];
	};
	
	var parse = __webpack_require__(4);
	var hsl = __webpack_require__(5);
	var lerp = __webpack_require__(9);
	var clamp = __webpack_require__(10);
	
	//const interpolate = require('color-interpolate');
	
	var palettes = [["#69d2e7", "#a7dbd8", "#e0e4cc", "#f38630", "#fa6900"], ["#fe4365", "#fc9d9a", "#f9cdad", "#c8c8a9", "#83af9b"], ["#ecd078", "#d95b43", "#c02942", "#542437", "#53777a"], ["#556270", "#4ecdc4", "#c7f464", "#ff6b6b", "#c44d58"], ["#774f38", "#e08e79", "#f1d4af", "#ece5ce", "#c5e0dc"], ["#e8ddcb", "#cdb380", "#036564", "#033649", "#031634"], ["#490a3d", "#bd1550", "#e97f02", "#f8ca00", "#8a9b0f"], ["#594f4f", "#547980", "#45ada8", "#9de0ad", "#e5fcc2"], ["#00a0b0", "#6a4a3c", "#cc333f", "#eb6841", "#edc951"], ["#e94e77", "#d68189", "#c6a49a", "#c6e5d9", "#f4ead5"], ["#3fb8af", "#7fc7af", "#dad8a7", "#ff9e9d", "#ff3d7f"], ["#d9ceb2", "#948c75", "#d5ded9", "#7a6a53", "#99b2b7"], ["#ffffff", "#cbe86b", "#f2e9e1", "#1c140d", "#cbe86b"], ["#efffcd", "#dce9be", "#555152", "#2e2633", "#99173c"], ["#343838", "#005f6b", "#008c9e", "#00b4cc", "#00dffc"], ["#413e4a", "#73626e", "#b38184", "#f0b49e", "#f7e4be"], ["#99b898", "#fecea8", "#ff847c", "#e84a5f", "#2a363b"], ["#ff4e50", "#fc913a", "#f9d423", "#ede574", "#e1f5c4"], ["#655643", "#80bca3", "#f6f7bd", "#e6ac27", "#bf4d28"], ["#351330", "#424254", "#64908a", "#e8caa4", "#cc2a41"], ["#00a8c6", "#40c0cb", "#f9f2e7", "#aee239", "#8fbe00"], ["#554236", "#f77825", "#d3ce3d", "#f1efa5", "#60b99a"], ["#ff9900", "#424242", "#e9e9e9", "#bcbcbc", "#3299bb"], ["#8c2318", "#5e8c6a", "#88a65e", "#bfb35a", "#f2c45a"], ["#fad089", "#ff9c5b", "#f5634a", "#ed303c", "#3b8183"], ["#5d4157", "#838689", "#a8caba", "#cad7b2", "#ebe3aa"], ["#ff4242", "#f4fad2", "#d4ee5e", "#e1edb9", "#f0f2eb"], ["#d1e751", "#ffffff", "#000000", "#4dbce9", "#26ade4"], ["#f8b195", "#f67280", "#c06c84", "#6c5b7b", "#355c7d"], ["#bcbdac", "#cfbe27", "#f27435", "#f02475", "#3b2d38"], ["#5e412f", "#fcebb6", "#78c0a8", "#f07818", "#f0a830"], ["#1b676b", "#519548", "#88c425", "#bef202", "#eafde6"], ["#eee6ab", "#c5bc8e", "#696758", "#45484b", "#36393b"], ["#452632", "#91204d", "#e4844a", "#e8bf56", "#e2f7ce"], ["#f0d8a8", "#3d1c00", "#86b8b1", "#f2d694", "#fa2a00"], ["#f04155", "#ff823a", "#f2f26f", "#fff7bd", "#95cfb7"], ["#2a044a", "#0b2e59", "#0d6759", "#7ab317", "#a0c55f"], ["#bbbb88", "#ccc68d", "#eedd99", "#eec290", "#eeaa88"], ["#b9d7d9", "#668284", "#2a2829", "#493736", "#7b3b3b"], ["#67917a", "#170409", "#b8af03", "#ccbf82", "#e33258"], ["#a3a948", "#edb92e", "#f85931", "#ce1836", "#009989"], ["#b3cc57", "#ecf081", "#ffbe40", "#ef746f", "#ab3e5b"], ["#e8d5b7", "#0e2430", "#fc3a51", "#f5b349", "#e8d5b9"], ["#ab526b", "#bca297", "#c5ceae", "#f0e2a4", "#f4ebc3"], ["#607848", "#789048", "#c0d860", "#f0f0d8", "#604848"], ["#aab3ab", "#c4cbb7", "#ebefc9", "#eee0b7", "#e8caaf"], ["#300030", "#480048", "#601848", "#c04848", "#f07241"], ["#a8e6ce", "#dcedc2", "#ffd3b5", "#ffaaa6", "#ff8c94"], ["#3e4147", "#fffedf", "#dfba69", "#5a2e2e", "#2a2c31"], ["#515151", "#ffffff", "#00b4ff", "#eeeeee"], ["#fc354c", "#29221f", "#13747d", "#0abfbc", "#fcf7c5"], ["#1c2130", "#028f76", "#b3e099", "#ffeaad", "#d14334"], ["#b6d8c0", "#c8d9bf", "#dadabd", "#ecdbbc", "#fedcba"], ["#edebe6", "#d6e1c7", "#94c7b6", "#403b33", "#d3643b"], ["#fdf1cc", "#c6d6b8", "#987f69", "#e3ad40", "#fcd036"], ["#cc0c39", "#e6781e", "#c8cf02", "#f8fcc1", "#1693a7"], ["#5c323e", "#a82743", "#e15e32", "#c0d23e", "#e5f04c"], ["#dad6ca", "#1bb0ce", "#4f8699", "#6a5e72", "#563444"], ["#230f2b", "#f21d41", "#ebebbc", "#bce3c5", "#82b3ae"], ["#b9d3b0", "#81bda4", "#b28774", "#f88f79", "#f6aa93"], ["#3a111c", "#574951", "#83988e", "#bcdea5", "#e6f9bc"], ["#a7c5bd", "#e5ddcb", "#eb7b59", "#cf4647", "#524656"], ["#5e3929", "#cd8c52", "#b7d1a3", "#dee8be", "#fcf7d3"], ["#1c0113", "#6b0103", "#a30006", "#c21a01", "#f03c02"], ["#8dccad", "#988864", "#fea6a2", "#f9d6ac", "#ffe9af"], ["#c1b398", "#605951", "#fbeec2", "#61a6ab", "#accec0"], ["#382f32", "#ffeaf2", "#fcd9e5", "#fbc5d8", "#f1396d"], ["#e3dfba", "#c8d6bf", "#93ccc6", "#6cbdb5", "#1a1f1e"], ["#5e9fa3", "#dcd1b4", "#fab87f", "#f87e7b", "#b05574"], ["#4e395d", "#827085", "#8ebe94", "#ccfc8e", "#dc5b3e"], ["#000000", "#9f111b", "#b11623", "#292c37", "#cccccc"], ["#cfffdd", "#b4dec1", "#5c5863", "#a85163", "#ff1f4c"], ["#9dc9ac", "#fffec7", "#f56218", "#ff9d2e", "#919167"], ["#413d3d", "#040004", "#c8ff00", "#fa023c", "#4b000f"], ["#951f2b", "#f5f4d7", "#e0dfb1", "#a5a36c", "#535233"], ["#1b325f", "#9cc4e4", "#e9f2f9", "#3a89c9", "#f26c4f"], ["#a8a7a7", "#cc527a", "#e8175d", "#474747", "#363636"], ["#eff3cd", "#b2d5ba", "#61ada0", "#248f8d", "#605063"], ["#2d2d29", "#215a6d", "#3ca2a2", "#92c7a3", "#dfece6"], ["#ffedbf", "#f7803c", "#f54828", "#2e0d23", "#f8e4c1"], ["#9d7e79", "#ccac95", "#9a947c", "#748b83", "#5b756c"], ["#f6f6f6", "#e8e8e8", "#333333", "#990100", "#b90504"], ["#0ca5b0", "#4e3f30", "#fefeeb", "#f8f4e4", "#a5b3aa"], ["#edf6ee", "#d1c089", "#b3204d", "#412e28", "#151101"], ["#d1313d", "#e5625c", "#f9bf76", "#8eb2c5", "#615375"], ["#fffbb7", "#a6f6af", "#66b6ab", "#5b7c8d", "#4f2958"], ["#4e4d4a", "#353432", "#94ba65", "#2790b0", "#2b4e72"], ["#f38a8a", "#55443d", "#a0cab5", "#cde9ca", "#f1edd0"], ["#a70267", "#f10c49", "#fb6b41", "#f6d86b", "#339194"], ["#fcfef5", "#e9ffe1", "#cdcfb7", "#d6e6c3", "#fafbe3"], ["#4d3b3b", "#de6262", "#ffb88c", "#ffd0b3", "#f5e0d3"], ["#c2412d", "#d1aa34", "#a7a844", "#a46583", "#5a1e4a"], ["#046d8b", "#309292", "#2fb8ac", "#93a42a", "#ecbe13"], ["#f8edd1", "#d88a8a", "#474843", "#9d9d93", "#c5cfc6"], ["#9cddc8", "#bfd8ad", "#ddd9ab", "#f7af63", "#633d2e"], ["#ffefd3", "#fffee4", "#d0ecea", "#9fd6d2", "#8b7a5e"], ["#30261c", "#403831", "#36544f", "#1f5f61", "#0b8185"], ["#75616b", "#bfcff7", "#dce4f7", "#f8f3bf", "#d34017"], ["#a1dbb2", "#fee5ad", "#faca66", "#f7a541", "#f45d4c"], ["#ff003c", "#ff8a00", "#fabe28", "#88c100", "#00c176"]];
	
	// color-interpolate code moved here because of uglifyjs problems
	function interpolate(palette) {
	    palette = palette.map(function (c) {
	        c = parse(c);
	        if (c.space != 'rgb') {
	            if (c.space != 'hsl') throw c.space + ' space is not supported.';
	            c.values = hsl.rgb(c.values);
	        }
	        c.values.push(c.alpha);
	        return c.values;
	    });
	
	    return function (t) {
	        var mix = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : lerp;
	
	        t = clamp(t, 0, 1);
	
	        var idx = (palette.length - 1) * t,
	            lIdx = Math.floor(idx),
	            rIdx = Math.ceil(idx);
	
	        t = idx - lIdx;
	
	        var lColor = palette[lIdx],
	            rColor = palette[rIdx];
	
	        var result = lColor.map(function (v, i) {
	            v = mix(v, rColor[i], t);
	            if (i < 3) v = Math.round(v);
	            return v;
	        });
	
	        if (result[3] === 1) {
	            return 'rgb(' + result.slice(0, 3) + ')';
	        }
	        return 'rgba(' + result + ')';
	    };
	}

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	
	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	
	var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();
	
	exports.default = function (pixelArray, iterationCountArray, width, height, histogram, paletteIndex) {
	
	    var rawIndex = 0,
	        pixelArrayIndex = 0;
	
	    var _generateColors = (0, _palette2.default)(histogram, paletteIndex),
	        _generateColors2 = _slicedToArray(_generateColors, 3),
	        reds = _generateColors2[0],
	        greens = _generateColors2[1],
	        blues = _generateColors2[2];
	
	    for (var i = 0; i < height; i++) {
	        for (var j = 0; j < width; j++) {
	            var iterationCount = iterationCountArray[rawIndex++];
	            if (iterationCount === histogram.length) {
	                pixelArray[pixelArrayIndex++] = 4; // failed
	                pixelArray[pixelArrayIndex++] = 4; // to
	                pixelArray[pixelArrayIndex++] = 4; // escape
	            } else if (iterationCount === -1) {
	                pixelArray[pixelArrayIndex++] = 0; // confirmed
	                pixelArray[pixelArrayIndex++] = 0; // to be
	                pixelArray[pixelArrayIndex++] = 0; // periodic
	            } else {
	                pixelArray[pixelArrayIndex++] = reds[iterationCount];
	                pixelArray[pixelArrayIndex++] = greens[iterationCount];
	                pixelArray[pixelArrayIndex++] = blues[iterationCount];
	            }
	            pixelArray[pixelArrayIndex++] = 255; //alpha
	        }
	    }
	};
	
	var _palette = __webpack_require__(1);
	
	var _palette2 = _interopRequireDefault(_palette);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = {
		"aliceblue": [240, 248, 255],
		"antiquewhite": [250, 235, 215],
		"aqua": [0, 255, 255],
		"aquamarine": [127, 255, 212],
		"azure": [240, 255, 255],
		"beige": [245, 245, 220],
		"bisque": [255, 228, 196],
		"black": [0, 0, 0],
		"blanchedalmond": [255, 235, 205],
		"blue": [0, 0, 255],
		"blueviolet": [138, 43, 226],
		"brown": [165, 42, 42],
		"burlywood": [222, 184, 135],
		"cadetblue": [95, 158, 160],
		"chartreuse": [127, 255, 0],
		"chocolate": [210, 105, 30],
		"coral": [255, 127, 80],
		"cornflowerblue": [100, 149, 237],
		"cornsilk": [255, 248, 220],
		"crimson": [220, 20, 60],
		"cyan": [0, 255, 255],
		"darkblue": [0, 0, 139],
		"darkcyan": [0, 139, 139],
		"darkgoldenrod": [184, 134, 11],
		"darkgray": [169, 169, 169],
		"darkgreen": [0, 100, 0],
		"darkgrey": [169, 169, 169],
		"darkkhaki": [189, 183, 107],
		"darkmagenta": [139, 0, 139],
		"darkolivegreen": [85, 107, 47],
		"darkorange": [255, 140, 0],
		"darkorchid": [153, 50, 204],
		"darkred": [139, 0, 0],
		"darksalmon": [233, 150, 122],
		"darkseagreen": [143, 188, 143],
		"darkslateblue": [72, 61, 139],
		"darkslategray": [47, 79, 79],
		"darkslategrey": [47, 79, 79],
		"darkturquoise": [0, 206, 209],
		"darkviolet": [148, 0, 211],
		"deeppink": [255, 20, 147],
		"deepskyblue": [0, 191, 255],
		"dimgray": [105, 105, 105],
		"dimgrey": [105, 105, 105],
		"dodgerblue": [30, 144, 255],
		"firebrick": [178, 34, 34],
		"floralwhite": [255, 250, 240],
		"forestgreen": [34, 139, 34],
		"fuchsia": [255, 0, 255],
		"gainsboro": [220, 220, 220],
		"ghostwhite": [248, 248, 255],
		"gold": [255, 215, 0],
		"goldenrod": [218, 165, 32],
		"gray": [128, 128, 128],
		"green": [0, 128, 0],
		"greenyellow": [173, 255, 47],
		"grey": [128, 128, 128],
		"honeydew": [240, 255, 240],
		"hotpink": [255, 105, 180],
		"indianred": [205, 92, 92],
		"indigo": [75, 0, 130],
		"ivory": [255, 255, 240],
		"khaki": [240, 230, 140],
		"lavender": [230, 230, 250],
		"lavenderblush": [255, 240, 245],
		"lawngreen": [124, 252, 0],
		"lemonchiffon": [255, 250, 205],
		"lightblue": [173, 216, 230],
		"lightcoral": [240, 128, 128],
		"lightcyan": [224, 255, 255],
		"lightgoldenrodyellow": [250, 250, 210],
		"lightgray": [211, 211, 211],
		"lightgreen": [144, 238, 144],
		"lightgrey": [211, 211, 211],
		"lightpink": [255, 182, 193],
		"lightsalmon": [255, 160, 122],
		"lightseagreen": [32, 178, 170],
		"lightskyblue": [135, 206, 250],
		"lightslategray": [119, 136, 153],
		"lightslategrey": [119, 136, 153],
		"lightsteelblue": [176, 196, 222],
		"lightyellow": [255, 255, 224],
		"lime": [0, 255, 0],
		"limegreen": [50, 205, 50],
		"linen": [250, 240, 230],
		"magenta": [255, 0, 255],
		"maroon": [128, 0, 0],
		"mediumaquamarine": [102, 205, 170],
		"mediumblue": [0, 0, 205],
		"mediumorchid": [186, 85, 211],
		"mediumpurple": [147, 112, 219],
		"mediumseagreen": [60, 179, 113],
		"mediumslateblue": [123, 104, 238],
		"mediumspringgreen": [0, 250, 154],
		"mediumturquoise": [72, 209, 204],
		"mediumvioletred": [199, 21, 133],
		"midnightblue": [25, 25, 112],
		"mintcream": [245, 255, 250],
		"mistyrose": [255, 228, 225],
		"moccasin": [255, 228, 181],
		"navajowhite": [255, 222, 173],
		"navy": [0, 0, 128],
		"oldlace": [253, 245, 230],
		"olive": [128, 128, 0],
		"olivedrab": [107, 142, 35],
		"orange": [255, 165, 0],
		"orangered": [255, 69, 0],
		"orchid": [218, 112, 214],
		"palegoldenrod": [238, 232, 170],
		"palegreen": [152, 251, 152],
		"paleturquoise": [175, 238, 238],
		"palevioletred": [219, 112, 147],
		"papayawhip": [255, 239, 213],
		"peachpuff": [255, 218, 185],
		"peru": [205, 133, 63],
		"pink": [255, 192, 203],
		"plum": [221, 160, 221],
		"powderblue": [176, 224, 230],
		"purple": [128, 0, 128],
		"rebeccapurple": [102, 51, 153],
		"red": [255, 0, 0],
		"rosybrown": [188, 143, 143],
		"royalblue": [65, 105, 225],
		"saddlebrown": [139, 69, 19],
		"salmon": [250, 128, 114],
		"sandybrown": [244, 164, 96],
		"seagreen": [46, 139, 87],
		"seashell": [255, 245, 238],
		"sienna": [160, 82, 45],
		"silver": [192, 192, 192],
		"skyblue": [135, 206, 235],
		"slateblue": [106, 90, 205],
		"slategray": [112, 128, 144],
		"slategrey": [112, 128, 144],
		"snow": [255, 250, 250],
		"springgreen": [0, 255, 127],
		"steelblue": [70, 130, 180],
		"tan": [210, 180, 140],
		"teal": [0, 128, 128],
		"thistle": [216, 191, 216],
		"tomato": [255, 99, 71],
		"turquoise": [64, 224, 208],
		"violet": [238, 130, 238],
		"wheat": [245, 222, 179],
		"white": [255, 255, 255],
		"whitesmoke": [245, 245, 245],
		"yellow": [255, 255, 0],
		"yellowgreen": [154, 205, 50]
	};

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module color-parse
	 */
	
	module.exports = parse;
	
	
	var names = __webpack_require__(3);
	var pad = __webpack_require__(8);
	var isObject = __webpack_require__(7);
	
	
	/**
	 * Base hues
	 * http://dev.w3.org/csswg/css-color/#typedef-named-hue
	 */
	//FIXME: use external hue detector
	var baseHues = {
		red: 0,
		orange: 60,
		yellow: 120,
		green: 180,
		blue: 240,
		purple: 300
	};
	
	var channels = {
		r: 0,
		red: 0,
		g: 1,
		green: 1,
		b: 2,
		blue: 2
	};
	
	
	/**
	 * Parse color from the string passed
	 *
	 * @return {Object} A space indicator `space`, an array `values` and `alpha`
	 */
	function parse (cstr) {
		var m, parts = [0,0,0], alpha = 1, space = 'rgb';
	
		//keyword
		if (names[cstr]) {
			parts = names[cstr].slice();
		}
	
		//reserved words
		else if (cstr === 'transparent') alpha = 0;
	
		//number (weird) case
		else if (typeof cstr === 'number') {
			parts = [cstr >>> 16, (cstr & 0x00ff00) >>> 8, cstr & 0x0000ff];
		}
	
		//object case - detects css cases of rgb and hsl
		else if (isObject(cstr)) {
			if (cstr.r != null) {
				parts = [cstr.r, cstr.g, cstr.b];
			}
			else if (cstr.red != null) {
				parts = [cstr.red, cstr.green, cstr.blue];
			}
			else if (cstr.h != null) {
				parts = [cstr.h, cstr.s, cstr.l];
				space = 'hsl';
			}
			else if (cstr.hue != null) {
				parts = [cstr.hue, cstr.saturation, cstr.lightness];
				space = 'hsl';
			}
	
			if (cstr.a != null) alpha = cstr.a;
			else if (cstr.alpha != null) alpha = cstr.alpha;
			else if (cstr.opacity != null) alpha = cstr.opacity / 100;
		}
	
		//array passed
		else if (Array.isArray(cstr) || ArrayBuffer.isView(cstr)) {
			parts = [cstr[0], cstr[1], cstr[2]];
			alpha = cstr.length === 4 ? cstr[3] : 1;
		}
	
		//hex
		else if (/^#[A-Fa-f0-9]+$/.test(cstr)) {
			var base = cstr.replace(/^#/,'');
			var size = base.length;
			var isShort = size <= 4;
	
			parts = base.split(isShort ? /(.)/ : /(..)/);
			parts = parts.filter(Boolean)
				.map(function (x) {
					if (isShort) {
						return parseInt(x + x, 16);
					}
					else {
						return parseInt(x, 16);
					}
				});
	
			if (parts.length === 4) {
				alpha = parts[3] / 255;
				parts = parts.slice(0,3);
			}
			if (!parts[0]) parts[0] = 0;
			if (!parts[1]) parts[1] = 0;
			if (!parts[2]) parts[2] = 0;
		}
	
		//color space
		else if (m = /^((?:rgb|hs[lvb]|hwb|cmyk?|xy[zy]|gray|lab|lchu?v?|[ly]uv|lms)a?)\s*\(([^\)]*)\)/.exec(cstr)) {
			var name = m[1];
			var base = name.replace(/a$/, '');
			space = base;
			var size = base === 'cmyk' ? 4 : base === 'gray' ? 1 : 3;
			parts = m[2].trim()
				.split(/\s*,\s*/)
				.map(function (x, i) {
					//<percentage>
					if (/%$/.test(x)) {
						//alpha
						if (i === size)	return parseFloat(x) / 100;
						//rgb
						if (base === 'rgb') return parseFloat(x) * 255 / 100;
						return parseFloat(x);
					}
					//hue
					else if (base[i] === 'h') {
						//<deg>
						if (/deg$/.test(x)) {
							return parseFloat(x);
						}
						//<base-hue>
						else if (baseHues[x] !== undefined) {
							return baseHues[x];
						}
					}
					return parseFloat(x);
				});
	
			if (name === base) parts.push(1);
			alpha = parts[size] === undefined ? 1 : parts[size];
			parts = parts.slice(0, size);
		}
	
		//named channels case
		else if (cstr.length > 10 && /[0-9](?:\s|\/)/.test(cstr)) {
			parts = cstr.match(/([0-9]+)/g).map(function (value) {
				return parseFloat(value);
			});
	
			space = cstr.match(/([a-z])/ig).join('').toLowerCase();
		}
	
		else {
			throw Error('Unable to parse ' + cstr);
		}
	
		return {
			space: space,
			values: parts,
			alpha: alpha
		};
	}

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * @module color-space/hsl
	 */
	'use strict'
	
	var rgb = __webpack_require__(6);
	
	module.exports = {
		name: 'hsl',
		min: [0,0,0],
		max: [360,100,100],
		channel: ['hue', 'saturation', 'lightness'],
		alias: ['HSL'],
	
		rgb: function(hsl) {
			var h = hsl[0] / 360,
					s = hsl[1] / 100,
					l = hsl[2] / 100,
					t1, t2, t3, rgb, val;
	
			if (s === 0) {
				val = l * 255;
				return [val, val, val];
			}
	
			if (l < 0.5) {
				t2 = l * (1 + s);
			}
			else {
				t2 = l + s - l * s;
			}
			t1 = 2 * l - t2;
	
			rgb = [0, 0, 0];
			for (var i = 0; i < 3; i++) {
				t3 = h + 1 / 3 * - (i - 1);
				if (t3 < 0) {
					t3++;
				}
				else if (t3 > 1) {
					t3--;
				}
	
				if (6 * t3 < 1) {
					val = t1 + (t2 - t1) * 6 * t3;
				}
				else if (2 * t3 < 1) {
					val = t2;
				}
				else if (3 * t3 < 2) {
					val = t1 + (t2 - t1) * (2 / 3 - t3) * 6;
				}
				else {
					val = t1;
				}
	
				rgb[i] = val * 255;
			}
	
			return rgb;
		}
	};
	
	
	//extend rgb
	rgb.hsl = function(rgb) {
		var r = rgb[0]/255,
				g = rgb[1]/255,
				b = rgb[2]/255,
				min = Math.min(r, g, b),
				max = Math.max(r, g, b),
				delta = max - min,
				h, s, l;
	
		if (max === min) {
			h = 0;
		}
		else if (r === max) {
			h = (g - b) / delta;
		}
		else if (g === max) {
			h = 2 + (b - r) / delta;
		}
		else if (b === max) {
			h = 4 + (r - g)/ delta;
		}
	
		h = Math.min(h * 60, 360);
	
		if (h < 0) {
			h += 360;
		}
	
		l = (min + max) / 2;
	
		if (max === min) {
			s = 0;
		}
		else if (l <= 0.5) {
			s = delta / (max + min);
		}
		else {
			s = delta / (2 - max - min);
		}
	
		return [h, s * 100, l * 100];
	};


/***/ },
/* 6 */
/***/ function(module, exports) {

	/**
	 * RGB space.
	 *
	 * @module  color-space/rgb
	 */
	'use strict'
	
	module.exports = {
		name: 'rgb',
		min: [0,0,0],
		max: [255,255,255],
		channel: ['red', 'green', 'blue'],
		alias: ['RGB']
	};


/***/ },
/* 7 */
/***/ function(module, exports) {

	'use strict';
	var toString = Object.prototype.toString;
	
	module.exports = function (x) {
		var prototype;
		return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
	};


/***/ },
/* 8 */
/***/ function(module, exports) {

	/* This program is free software. It comes without any warranty, to
	     * the extent permitted by applicable law. You can redistribute it
	     * and/or modify it under the terms of the Do What The Fuck You Want
	     * To Public License, Version 2, as published by Sam Hocevar. See
	     * http://www.wtfpl.net/ for more details. */
	'use strict';
	module.exports = leftPad;
	
	var cache = [
	  '',
	  ' ',
	  '  ',
	  '   ',
	  '    ',
	  '     ',
	  '      ',
	  '       ',
	  '        ',
	  '         '
	];
	
	function leftPad (str, len, ch) {
	  // convert `str` to `string`
	  str = str + '';
	  // `len` is the `pad`'s length now
	  len = len - str.length;
	  // doesn't need to pad
	  if (len <= 0) return str;
	  // `ch` defaults to `' '`
	  if (!ch && ch !== 0) ch = ' ';
	  // convert `ch` to `string`
	  ch = ch + '';
	  // cache common use cases
	  if (ch === ' ' && len < 10) return cache[len] + str;
	  // `pad` starts with an empty string
	  var pad = '';
	  // loop
	  while (true) {
	    // add `ch` to `pad` if `len` is odd
	    if (len & 1) pad += ch;
	    // divide `len` by 2, ditch the remainder
	    len >>= 1;
	    // "double" the `ch` so this operation count grows logarithmically on `len`
	    // each time `ch` is "doubled", the `len` would need to be "doubled" too
	    // similar to finding a value in binary search tree, hence O(log(n))
	    if (len) ch += ch;
	    // `len` is 0, exit the loop
	    else break;
	  }
	  // pad `str`!
	  return pad + str;
	}


/***/ },
/* 9 */
/***/ function(module, exports) {

	function lerp(v0, v1, t) {
	    return v0*(1-t)+v1*t
	}
	module.exports = lerp

/***/ },
/* 10 */
/***/ function(module, exports) {

	/**
	 * Clamp value.
	 * Detects proper clamp min/max.
	 *
	 * @param {number} a Current value to cut off
	 * @param {number} min One side limit
	 * @param {number} max Other side limit
	 *
	 * @return {number} Clamped value
	 */
	'use strict';
	module.exports = function(a, min, max){
		return max > min ? Math.max(Math.min(a,max),min) : Math.max(Math.min(a,min),max);
	};


/***/ }
/******/ ]);
//# sourceMappingURL=bd41ced612d35cf9c080.worker.js.map