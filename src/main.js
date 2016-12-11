import $ from 'jquery';
import FractalComponent from './mandelbrot.js';
import OrbitDrawerComponent from './orbit.js';
const FONT_NAME = 'WheatonCapitals-Regular';

$(function() {

    if (document.fonts.load) {
        try {
            document.fonts.load(`10pt "${FONT_NAME}"`).then(console.log);
        }
        catch(e) {
            console.log(e);
        }
    }
    const cars1 = new Audio('../audio/cars1.mp3'), cars2 = new Audio('../audio/cars2.mp3');

    setInterval(()=>{cars1.play()}, 4000);
    setInterval(()=>{cars2.play()}, 5000);

    const paletteIndexM = Math.floor(100 * Math.random());
    const paletteIndexJ = Math.floor(100 * Math.random());

    const mandel = new FractalComponent($('#mandel')[0],
        true,
        {
            frameNumber: 0,
            x1: -2,
            y1: -1.15,
            x2: 1.0,
            y2: 1.15,
            paletteIndex: paletteIndexM,
        }
    );

    const julia = new FractalComponent($('#julia')[0], false);

    const orbitDrawer = new OrbitDrawerComponent($('#orbits')[0],
        $('#escapeIters')[0],
        $('#periodicity')[0],
    );

    let responsiveJulia = true;

    mandel.on('update-hover', location => {
        const {x, y} = location;
        if (responsiveJulia) {
            julia.startCalculating({
                frameNumber: 0,
                x1: -2,
                y1: -1.15,
                x2: 1.0,
                y2: 1.15,
                juliaX: x,
                juliaY: y,
                paletteIndex: paletteIndexJ,
            });
        }
    });
    mandel.on('clear-hover', julia.reset.bind(julia));

    mandel.on('update-hover', location => {
        orbitDrawer.updateHover(location);
    });
    mandel.on('clear-hover', orbitDrawer.clearHover.bind(orbitDrawer));
    mandel.on('zoom-start', obj => {
        responsiveJulia = false;
    });
    mandel.on('zoom-end', obj => {
        responsiveJulia = true;
    });


});
