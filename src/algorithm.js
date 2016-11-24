import interpolate from 'color-interpolate';

function generateColors(histogram) {

    const colormap = interpolate(['red', 'blue']);
    // Compute cumulativeHistogram
    let total = 0;
    for (let i = 0; i < histogram.length; i += 1) {
        total += histogram[i]
    }
    total = histogram.reduce((a, b) => a + b, 0);
    const cumulativeHistogram = Array(histogram.length);
    histogram.reduce((sum, currentValue, currentIndex) => {
        sum += currentValue / total;
        cumulativeHistogram[currentIndex] = sum;
        return sum;
    }, 0);
    const reds = Array(histogram.length), greens = Array(histogram.length), blues = Array(histogram.length);
    for (let i = 0; i < histogram.length; i++) {
        const rgbCSS = colormap(cumulativeHistogram[i]);
        const rgb = rgbCSS.match(/rgb\((\d+),(\d+),(\d+)\)/);
        reds[i] = rgb[1];
        greens[i] = rgb[2];
        blues[i] = rgb[3];
    }
    return [reds, greens, blues];
}

function generateFractal(parameters) {
    //console.time("generateFractal");
    const {x1, y1, x2, y2, width, height} = parameters;
    const xstep = (x2 - x1) / width, ystep = (y2 - y1) / height;

    const iterationCountArray = Array(width * height).fill(0.0);
    const z_real_Array = Array(width * height).fill(0.0);
    const z_imag_Array = Array(width * height).fill(0.0);
    const pixelArray = new Uint8ClampedArray(4 * width * height);

    // console.time('raw');
    // Compute iterationCountArray
    const maxIters = 512;
    const histogram = Array(maxIters);
    histogram.fill(0);

    let rawIndex = 0;
    for (let y = y1, i=0; i < height; i++, y += ystep) {
        for (let x = x1, j = 0; j < width; j++, x += xstep) {
            const cx = x, cy = y;
            let zx_original = z_real_Array[rawIndex], zy_original = z_imag_Array[rawIndex];
            let zx = zx_original, zy = zy_original;
            let iterationCount;
            // The >= 0 check is for the -1 values indicating periodicity
            for (iterationCount = iterationCountArray[rawIndex]; iterationCount >= 0 && iterationCount < maxIters; iterationCount++) {
                const x2 = zx * zx - zy * zy;
                zy = 2 * zx * zy + cy;
                zx = x2 + cx;
                if (zx * zx + zy * zy >= 4) {
                    histogram[iterationCount]++;
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

    rawIndex = 0;
    let pixelIndex = 0;
    const [reds, greens, blues] = generateColors(histogram);

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const iterationCount = iterationCountArray[rawIndex++];
            if (iterationCount === maxIters) {
                pixelArray[pixelIndex++] = 0;
                pixelArray[pixelIndex++] = 0;
                pixelArray[pixelIndex++] = 0;
            } else if (iterationCount === -1) {
                pixelArray[pixelIndex++] = 0;
                pixelArray[pixelIndex++] = 255;
                pixelArray[pixelIndex++] = 0;
            } else {
                pixelArray[pixelIndex++] = reds[iterationCount];  //red
                pixelArray[pixelIndex++] = greens[iterationCount];  //green
                pixelArray[pixelIndex++] = blues[iterationCount];  //blue
            }
            pixelArray[pixelIndex++] = 255; //alpha
        }
    }
    postMessage({
        pixelArray,
        ...parameters
    });
}

addEventListener('message', (e) => {
    generateFractal(e.data);
}, false);
