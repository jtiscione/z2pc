import interpolate from 'color-interpolate';
const palettes = [
    ["#69d2e7","#a7dbd8","#e0e4cc","#f38630","#fa6900"],
    ["#fe4365","#fc9d9a","#f9cdad","#c8c8a9","#83af9b"],
    ["#ecd078","#d95b43","#c02942","#542437","#53777a"],
    ["#556270","#4ecdc4","#c7f464","#ff6b6b","#c44d58"],
    ["#774f38","#e08e79","#f1d4af","#ece5ce","#c5e0dc"],
    ["#e8ddcb","#cdb380","#036564","#033649","#031634"],
    ["#490a3d","#bd1550","#e97f02","#f8ca00","#8a9b0f"],
    ["#594f4f","#547980","#45ada8","#9de0ad","#e5fcc2"],
    ["#00a0b0","#6a4a3c","#cc333f","#eb6841","#edc951"],
    ["#e94e77","#d68189","#c6a49a","#c6e5d9","#f4ead5"],
    ["#3fb8af","#7fc7af","#dad8a7","#ff9e9d","#ff3d7f"],
    ["#d9ceb2","#948c75","#d5ded9","#7a6a53","#99b2b7"],
    ["#ffffff","#cbe86b","#f2e9e1","#1c140d","#cbe86b"],
    ["#efffcd","#dce9be","#555152","#2e2633","#99173c"],
    ["#343838","#005f6b","#008c9e","#00b4cc","#00dffc"],
    ["#413e4a","#73626e","#b38184","#f0b49e","#f7e4be"],
    ["#99b898","#fecea8","#ff847c","#e84a5f","#2a363b"],
    ["#ff4e50","#fc913a","#f9d423","#ede574","#e1f5c4"],
    ["#655643","#80bca3","#f6f7bd","#e6ac27","#bf4d28"],
    ["#351330","#424254","#64908a","#e8caa4","#cc2a41"],
    ["#00a8c6","#40c0cb","#f9f2e7","#aee239","#8fbe00"],
    ["#554236","#f77825","#d3ce3d","#f1efa5","#60b99a"],
    ["#ff9900","#424242","#e9e9e9","#bcbcbc","#3299bb"],
    ["#8c2318","#5e8c6a","#88a65e","#bfb35a","#f2c45a"],
    ["#fad089","#ff9c5b","#f5634a","#ed303c","#3b8183"],
    ["#5d4157","#838689","#a8caba","#cad7b2","#ebe3aa"],
    ["#ff4242","#f4fad2","#d4ee5e","#e1edb9","#f0f2eb"],
    ["#d1e751","#ffffff","#000000","#4dbce9","#26ade4"],
    ["#f8b195","#f67280","#c06c84","#6c5b7b","#355c7d"],
    ["#bcbdac","#cfbe27","#f27435","#f02475","#3b2d38"],
    ["#5e412f","#fcebb6","#78c0a8","#f07818","#f0a830"],
    ["#1b676b","#519548","#88c425","#bef202","#eafde6"],
    ["#eee6ab","#c5bc8e","#696758","#45484b","#36393b"],
    ["#452632","#91204d","#e4844a","#e8bf56","#e2f7ce"],
    ["#f0d8a8","#3d1c00","#86b8b1","#f2d694","#fa2a00"],
    ["#f04155","#ff823a","#f2f26f","#fff7bd","#95cfb7"],
    ["#2a044a","#0b2e59","#0d6759","#7ab317","#a0c55f"],
    ["#bbbb88","#ccc68d","#eedd99","#eec290","#eeaa88"],
    ["#b9d7d9","#668284","#2a2829","#493736","#7b3b3b"],
    ["#67917a","#170409","#b8af03","#ccbf82","#e33258"],
    ["#a3a948","#edb92e","#f85931","#ce1836","#009989"],
    ["#b3cc57","#ecf081","#ffbe40","#ef746f","#ab3e5b"],
    ["#e8d5b7","#0e2430","#fc3a51","#f5b349","#e8d5b9"],
    ["#ab526b","#bca297","#c5ceae","#f0e2a4","#f4ebc3"],
    ["#607848","#789048","#c0d860","#f0f0d8","#604848"],
    ["#aab3ab","#c4cbb7","#ebefc9","#eee0b7","#e8caaf"],
    ["#300030","#480048","#601848","#c04848","#f07241"],
    ["#a8e6ce","#dcedc2","#ffd3b5","#ffaaa6","#ff8c94"],
    ["#3e4147","#fffedf","#dfba69","#5a2e2e","#2a2c31"],
    ["#515151","#ffffff","#00b4ff","#eeeeee"],
    ["#fc354c","#29221f","#13747d","#0abfbc","#fcf7c5"],
    ["#1c2130","#028f76","#b3e099","#ffeaad","#d14334"],
    ["#b6d8c0","#c8d9bf","#dadabd","#ecdbbc","#fedcba"],
    ["#edebe6","#d6e1c7","#94c7b6","#403b33","#d3643b"],
    ["#fdf1cc","#c6d6b8","#987f69","#e3ad40","#fcd036"],
    ["#cc0c39","#e6781e","#c8cf02","#f8fcc1","#1693a7"],
    ["#5c323e","#a82743","#e15e32","#c0d23e","#e5f04c"],
    ["#dad6ca","#1bb0ce","#4f8699","#6a5e72","#563444"],
    ["#230f2b","#f21d41","#ebebbc","#bce3c5","#82b3ae"],
    ["#b9d3b0","#81bda4","#b28774","#f88f79","#f6aa93"],
    ["#3a111c","#574951","#83988e","#bcdea5","#e6f9bc"],
    ["#a7c5bd","#e5ddcb","#eb7b59","#cf4647","#524656"],
    ["#5e3929","#cd8c52","#b7d1a3","#dee8be","#fcf7d3"],
    ["#1c0113","#6b0103","#a30006","#c21a01","#f03c02"],
    ["#8dccad","#988864","#fea6a2","#f9d6ac","#ffe9af"],
    ["#c1b398","#605951","#fbeec2","#61a6ab","#accec0"],
    ["#382f32","#ffeaf2","#fcd9e5","#fbc5d8","#f1396d"],
    ["#e3dfba","#c8d6bf","#93ccc6","#6cbdb5","#1a1f1e"],
    ["#5e9fa3","#dcd1b4","#fab87f","#f87e7b","#b05574"],
    ["#4e395d","#827085","#8ebe94","#ccfc8e","#dc5b3e"],
    ["#000000","#9f111b","#b11623","#292c37","#cccccc"],
    ["#cfffdd","#b4dec1","#5c5863","#a85163","#ff1f4c"],
    ["#9dc9ac","#fffec7","#f56218","#ff9d2e","#919167"],
    ["#413d3d","#040004","#c8ff00","#fa023c","#4b000f"],
    ["#951f2b","#f5f4d7","#e0dfb1","#a5a36c","#535233"],
    ["#1b325f","#9cc4e4","#e9f2f9","#3a89c9","#f26c4f"],
    ["#a8a7a7","#cc527a","#e8175d","#474747","#363636"],
    ["#eff3cd","#b2d5ba","#61ada0","#248f8d","#605063"],
    ["#2d2d29","#215a6d","#3ca2a2","#92c7a3","#dfece6"],
    ["#ffedbf","#f7803c","#f54828","#2e0d23","#f8e4c1"],
    ["#9d7e79","#ccac95","#9a947c","#748b83","#5b756c"],
    ["#f6f6f6","#e8e8e8","#333333","#990100","#b90504"],
    ["#0ca5b0","#4e3f30","#fefeeb","#f8f4e4","#a5b3aa"],
    ["#edf6ee","#d1c089","#b3204d","#412e28","#151101"],
    ["#d1313d","#e5625c","#f9bf76","#8eb2c5","#615375"],
    ["#fffbb7","#a6f6af","#66b6ab","#5b7c8d","#4f2958"],
    ["#4e4d4a","#353432","#94ba65","#2790b0","#2b4e72"],
    ["#f38a8a","#55443d","#a0cab5","#cde9ca","#f1edd0"],
    ["#a70267","#f10c49","#fb6b41","#f6d86b","#339194"],
    ["#fcfef5","#e9ffe1","#cdcfb7","#d6e6c3","#fafbe3"],
    ["#4d3b3b","#de6262","#ffb88c","#ffd0b3","#f5e0d3"],
    ["#c2412d","#d1aa34","#a7a844","#a46583","#5a1e4a"],
    ["#046d8b","#309292","#2fb8ac","#93a42a","#ecbe13"],
    ["#f8edd1","#d88a8a","#474843","#9d9d93","#c5cfc6"],
    ["#9cddc8","#bfd8ad","#ddd9ab","#f7af63","#633d2e"],
    ["#ffefd3","#fffee4","#d0ecea","#9fd6d2","#8b7a5e"],
    ["#30261c","#403831","#36544f","#1f5f61","#0b8185"],
    ["#75616b","#bfcff7","#dce4f7","#f8f3bf","#d34017"],
    ["#a1dbb2","#fee5ad","#faca66","#f7a541","#f45d4c"],
    ["#ff003c","#ff8a00","#fabe28","#88c100","#00c176"]
];

function generateColors(histogram, paletteIndex) {
    const colormap = interpolate(palettes[paletteIndex]);
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
        let rgbCSS = colormap(cumulativeHistogram[i]);
        const rgb = rgbCSS.match(/rgb\((\d+),(\d+),(\d+)\)/);
        reds[i] = rgb[1];
        greens[i] = rgb[2];
        blues[i] = rgb[3];
    }
    return [reds, greens, blues];
}

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
                 // The >= 0 check is for the -1 values indicating periodicity
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

         if (latestParameters !== parameters) {
             return;
         }

         if (totalHits === 0) {
             priorMaxIters = maxIters;
             maxIters *= 8;
             setTimeout(loopIteration, 5);
             return;
         }

         rawIndex = 0;
         let pixelIndex = 0;
         const [reds, greens, blues] = generateColors(histogram, paletteIndex);

         for (let i = 0; i < height && latestParameters === parameters; i++) {
             for (let j = 0; j < width && latestParameters === parameters; j++) {
                 const iterationCount = iterationCountArray[rawIndex++];
                 if (iterationCount === maxIters) {
                     pixelArray[pixelIndex++] = 8;
                     pixelArray[pixelIndex++] = 8;
                     pixelArray[pixelIndex++] = 8;
                 } else if (iterationCount === -1) {
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
         if (latestParameters !== parameters) {
             return;
         }
         const done = !(hits > 1000 && maxIters < 16384);
         postMessage({
             pixelArray,
             maxIters,
             done,
             ...parameters
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
