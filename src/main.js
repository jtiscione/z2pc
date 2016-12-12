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

    new Audio('audio/intro.mp3').play();

    $('.slide').animate({
        'margin-top': -550,
    }, 57000, function() {
        $('#orbits').css('display', 'block');
        $('.overlay').fadeTo(2000, 0.0, function() {
            $('.overlay').css('display', 'none');
        });
        console.log("done");
    });

    const cars1 = new Audio('audio/cars1.mp3'), cars2 = new Audio('audio/cars2.mp3');

    //cars1.loop();
    //cars2.loop();
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


    const orbitDrawer = new OrbitDrawerComponent($('#orbits')[0]);

    let responsive = true;

    /*
     //const julia = new FractalComponent($('#julia')[0], false);
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
    */

    mandel.on('update-hover', location => {
        if (responsive) {
            orbitDrawer.updateHover(location);
        }
    });
    mandel.on('clear-hover', orbitDrawer.clearHover.bind(orbitDrawer));
    mandel.on('zoom-start', obj => {
        orbitDrawer.clearHover();
        responsive = false;
    });
    mandel.on('zoom-end', obj => {
        responsive = true;
    });


});
