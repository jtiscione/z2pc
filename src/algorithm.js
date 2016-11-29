import fillPixels from './pixelfiller.js';

let latestParameters = null;

function generateFractal(parameters) {

    latestParameters = parameters;
    const {x1, y1, x2, y2, width, height, paletteIndex} = parameters;
    const xstep = (x2 - x1) / width, ystep = (y2 - y1) / height;
    const iterationCountArray = Array(width * height).fill(0.0);
    const z_real_Array = Array(width * height).fill(0.0);
    const z_imag_Array = Array(width * height).fill(0.0);
    const pixelArray = new Uint8ClampedArray(4 * width * height);

     let histogram = [];
     let totalHits = 0;
     let priorMaxIters = 0, maxIters = 256;

     const loopIteration = () => {

         if (latestParameters !== parameters) {
             return;
         }

         if (histogram.length < maxIters) {
             histogram = histogram.concat(Array(maxIters - histogram.length).fill(0.0));
         }

         let hits = 0;

         let rawIndex = 0;
         for (let y = y1, i = 0; i < height; i++, y += ystep) {
             for (let x = x1, j = 0; j < width; j++, x += xstep) {
                 const cx = x, cy = y;
                 let zx_original = z_real_Array[rawIndex], zy_original = z_imag_Array[rawIndex];
                 let zx = zx_original, zy = zy_original;
                 let iterationCount;
                 // Any -1 values indicating periodicity are bypassed by the >= priorMaxIters check
                 for (iterationCount = iterationCountArray[rawIndex]; iterationCount >= priorMaxIters && iterationCount < maxIters; iterationCount++) {
                     const x2 = zx * zx - zy * zy;
                     zy = 2 * zx * zy + cy;
                     zx = x2 + cx;
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

         fillPixels(pixelArray, iterationCountArray, width, height, histogram, paletteIndex);

         const done = hits < 1000 || maxIters >= 16384;
         postMessage({
             parameters,
             results: {
                 iterationCountArray,
                 histogram,
                 pixelArray,
                 maxIters,
                 done,
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

addEventListener('message', (e) => {
    generateFractal(e.data);
}, false);
