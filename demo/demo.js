const mandelbrotCanvas = document.getElementById('mandel');
const ctx = mandelbrotCanvas.getContext('2d');
const width = mandelbrotCanvas.width, height = mandelbrotCanvas.height;

function paint(fractal) {
    const imageData = ctx.createImageData(fractal.width, fractal.height);
    imageData.data.set(fractal.pixelArray);
    ctx.putImageData(imageData, fractal.top, fractal.left);
}

let params = {
    top: 0,
    left: 0,
    x1: -2,
    y1: -4/3,
    x2: 1.0,
    y2: 4/3,
    width,
    height,
    maxIters: 512
};
//paint(generateFractal(params));

mandelbrotCanvas.addEventListener('click', (e) => {
    e.preventDefault();
    const {x1, y1, x2, y2, width, height} = params;
    const scale = 10;

    params = Object.assign({}, params, {
        x1: x1 + (e.offsetX / width) * (x2 - x1) - (x2 - x1) / (2 * scale),
        y1: y1 + (e.offsetY / height) * (y2 - y1) - (y2 - y1) / (2 * scale),
        x2: x1 + (e.offsetX / width) * (x2 - x1) + (x2 - x1) / (2 * scale),
        y2: y1 + (e.offsetY / height) * (y2 - y1) + (y2 - y1) / (2 * scale)
    });
    //paint(generateFractal(params));
    worker.postMessage(params);
});

//paint(generateFractal(params));
const worker = new Worker('algorithm.js');
worker.addEventListener('message', (e) => paint(e.data));
worker.postMessage(params);

