import interpolate from 'color-interpolate';

function generateFractal(parameters) {
    console.time("generateFractal");

    const colormap = interpolate(['red', 'blue']);

    const {x1, y1, x2, y2, width, height, maxIters} = parameters;

    function mandel(x, y, max) {
        const cx = x, cy = y;
        for (let i = 0; i < max; i++) {
            const x2 = x * x - y * y;
            y = 2 * x * y + cy;
            x = x2 + cx;
            if (x * x + y * y >= 4) {
                return i;
            }
        }
        return max;
    }
    // console.time('rawArray');
    // Compute rawArray
    const histogram = Array(maxIters);
    histogram.fill(0);
    const rawArray = Array(width * height);

    const xstep = (x2 - x1) / width, ystep = (y2 - y1) / height;
    let rawIndex = 0;
    for (let y = y1, i=0; i < height; i++, y += ystep) {
        for (let x = x1, j = 0; j < width; j++, x += xstep) {
            const iterationCount = mandel(x, y, maxIters);
            if (iterationCount < maxIters) {
                histogram[iterationCount]++;
            }
            rawArray[rawIndex++] = iterationCount;
        }
    }
    console.timeEnd('rawArray');
    console.time("histo");
    // Compute cumulativeHistogram
    let total = 0;
    for (let i = 0; i < maxIters; i += 1) {
        total += histogram[i]
    }
    total = histogram.reduce((a, b) => a + b, 0);
    const cumulativeHistogram = Array(maxIters);
    histogram.reduce((sum, currentValue, currentIndex) => {
        sum += currentValue / total;
        cumulativeHistogram[currentIndex] = sum;
        return sum;
    }, 0);
    const reds = Array(maxIters), greens = Array(maxIters), blues = Array(maxIters);
    for (let i = 0; i < maxIters; i++) {
        const rgbCSS = colormap(cumulativeHistogram[i]);
        const rgb = rgbCSS.match(/rgb\((\d+),(\d+),(\d+)\)/);
        const [match, red, green, blue] = rgb;
        reds[i] = rgb[1];
        greens[i] = rgb[2];
        blues[i] = rgb[3];
    }
    console.timeEnd('histo');
    console.time("pixellating");
    // Iterate over pixels and assign RGB values based on cumulativeHistogram
    const pixelArray = new Uint8ClampedArray(4 * width * height);
    rawIndex = 0;
    let pixelIndex = 0;
    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const iterationCount = rawArray[rawIndex++];
            if (iterationCount === maxIters) {
                pixelArray[pixelIndex++] = 0;
                pixelArray[pixelIndex++] = 0;
                pixelArray[pixelIndex++] = 0;
            } else {
                pixelArray[pixelIndex++] = reds[iterationCount];  //red
                pixelArray[pixelIndex++] = greens[iterationCount];  //green
                pixelArray[pixelIndex++] = blues[iterationCount];  //blue
            }
            pixelArray[pixelIndex++] = 255; //alpha
        }
    }
    console.timeEnd('pixellating');
    console.timeEnd("generateFractal");
    // Return copy of params object with RGB array included
   return Object.assign({}, parameters, {pixelArray});
}

addEventListener('message', (e) => {
    postMessage(generateFractal(e.data));
}, false);
