import generateColors from './palette.js';

export default function(pixelArray, iterationCountArray, width, height, histogram, paletteIndex) {

    let rawIndex = 0, pixelArrayIndex = 0;
    const [reds, greens, blues] = generateColors(histogram, paletteIndex);

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            const iterationCount = iterationCountArray[rawIndex++];
            if (iterationCount === histogram.length) {
                pixelArray[pixelArrayIndex++] = 4;  // failed
                pixelArray[pixelArrayIndex++] = 4;  // to
                pixelArray[pixelArrayIndex++] = 4;  // escape
            } else if (iterationCount === -1) {
                pixelArray[pixelArrayIndex++] = 0;  // confirmed
                pixelArray[pixelArrayIndex++] = 0;  // to be
                pixelArray[pixelArrayIndex++] = 0;  // periodic
            } else {
                pixelArray[pixelArrayIndex++] = reds[iterationCount];
                pixelArray[pixelArrayIndex++] = greens[iterationCount];
                pixelArray[pixelArrayIndex++] = blues[iterationCount];
            }
            pixelArray[pixelArrayIndex++] = 255; //alpha
        }
    }
}
