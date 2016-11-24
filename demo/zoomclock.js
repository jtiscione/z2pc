var  canvas = document.getElementById('clock'),
    context = canvas.getContext('2d'),
    zoomed = false,
    mousedown = {},
    rubberbandRectangle = {},
    dragging = false,
    SHADOW_COLOR = 'rgba(0, 0, 0, 0.7)',
    FONT_HEIGHT = 20,
    MARGIN = 10,
    HAND_TRUNCATION = canvas.height / 25,
    HOUR_HAND_TRUNCATION = canvas.height / 10,
    CENTER_HUB_RADIUS = 10,
    RIM_RADIUS = canvas.height / 2 - MARGIN,
    MAJOR_TICKMARK_RADIUS = RIM_RADIUS - 2 * HAND_TRUNCATION,
    MINOR_TICKMARK_RADIUS = RIM_RADIUS - HAND_TRUNCATION,
    MS_RESOLUTION = 40;

var rubberbandDiv = document.createElement('div');
rubberbandDiv.style.position ='absolute';
rubberbandDiv.style.border ='3px solid blue';
rubberbandDiv.style.cursor='crosshair';
rubberbandDiv.style.display='none';
document.body.appendChild(rubberbandDiv);

drawBaseImage();
var baseImageData = context.getImageData(0, 0, canvas.width, canvas.height);

updateTime();
drawClock();

loop = setInterval(
    function() {
      updateTime();
      drawClock();
  }, MS_RESOLUTION);

var ms, sec, min, hr;

function updateTime() {
  var dt = new Date();
  ms = dt.getMilliseconds();
  sec = dt.getSeconds();
  min = dt.getMinutes();
  hr = dt.getHours();
  if (hr >= 12) {
    hr -= 12;
  }
  sec += (ms / 1000);
  min += (sec / 60);
  hr += (min / 60);
  /*
  if (Math.floor(min) === 0 && Math.floor(sec) === 0) {
      new Audio('pink_floyd_time.mp3').play();
  }
  */
}

function drawClock() {
  console.log("drawClock");
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.putImageData(baseImageData, 0, 0);
  drawHands();
  if (zoomed && rubberbandRectangle.width != 0 && rubberbandRectangle.height != 0) {
   var bbox = canvas.getBoundingClientRect();
   try {
     var unmagnified = new Image();
     unmagnified.src = canvas.toDataURL();
     context.clearRect(0, 0, canvas.width, canvas.height);
     context.drawImage(unmagnified,
                        rubberbandRectangle.left - bbox.left,
                        rubberbandRectangle.top - bbox.top,
                        rubberbandRectangle.width,
                        rubberbandRectangle.height,
                        0, 0, canvas.width, canvas.height);
   }
   catch (e) {
     console.log(e);
   }
  }
}

function drawBaseImage() {

  //circle
  context.beginPath();
  context.save();
  context.shadowColor = SHADOW_COLOR;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;
  context.shadowBlur = 8;
  context.arc(canvas.width/2, canvas.height/2,
              RIM_RADIUS, 0, Math.PI*2, true);
  context.strokeStyle = 'black';
  context.lineWidth = 4.0;
  context.stroke();
  var gradient = context.createRadialGradient(canvas.width/2, canvas.height/2, CENTER_HUB_RADIUS,
                                              canvas.width/2, canvas.height/2, RIM_RADIUS);
  gradient.addColorStop(0.0, '#606060');
  gradient.addColorStop(1.0, 'white');
  context.fillStyle = gradient;
  context.fill();

  // center hub
  context.beginPath();
  context.fillStyle='black';
  context.arc(canvas.width/2, canvas.height/2, CENTER_HUB_RADIUS, 0,
                Math.PI*2, true);
  context.fill();
  context.restore();

  // numerals
  var numerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  context.font = FONT_HEIGHT+'pt Times';
  context.beginPath();
  context.fillStyle = 'black';
  for (i in numerals) {
      var angle = Math.PI/6 * (i-2);
      var numeralWidth = context.measureText(numerals[i]).width;
      context.fillText(numerals[i],
                       canvas.width/2
                       + Math.cos(angle) * (RIM_RADIUS - 3 * HAND_TRUNCATION)
                       - numeralWidth / 2,
                       canvas.height/2
                       + Math.sin(angle) * (RIM_RADIUS - 3 * HAND_TRUNCATION)
                       + FONT_HEIGHT/2);
  }

  //tick marks
  context.beginPath();
  context.strokeStyle = '#000000';
  context.lineWidth = 1.0;
  for (var tickMark = 0; tickMark < 60; tickMark++) {
    var angle = (Math.PI * 2) * (tickMark/60) - Math.PI / 2;
    context.moveTo(canvas.width / 2 + RIM_RADIUS * Math.cos(angle),
                   canvas.height / 2 + RIM_RADIUS * Math.sin(angle));
    var tickMarkRadius = (tickMark % 5 == 0 ? MAJOR_TICKMARK_RADIUS : MINOR_TICKMARK_RADIUS);
    context.lineTo(canvas.width / 2 + (tickMarkRadius * Math.cos(angle)),
                   canvas.height / 2 + (tickMarkRadius * Math.sin(angle)));
    context.stroke();
  }

  context.save();
  var logo = "PSYCHO";
  context.font = "small-caps 18pt Verdana";
  var logoWidth = context.measureText(logo).width;
  context.fillText(logo,
                   canvas.width / 2 - logoWidth / 2,
                   0.33 * canvas.height);

  var subtext = 'Zoomable';
  context.font = 'small-caps 16pt Copperplate';
  var subtextWidth = context.measureText(subtext).width;
  context.fillText(subtext,
                   canvas.width / 2 - subtextWidth / 2,
                   0.67 * canvas.height);

  context.restore();
}


function drawHands() {
  drawHand(hr*5, true, 'black', 0.5, 0.01);
  drawHand(min, false, 'black', 0.3, 0.01);
  drawHand(sec, false, 'red', 0.2, 0.005);
}

function drawHand(loc, isHour, style, baseRadians, tipRadians) {

  context.save();
  context.shadowColor = SHADOW_COLOR;
  context.shadowOffsetX = 5;
  context.shadowOffsetY = 5;
  context.shadowBlur = 5;

  var angle = (Math.PI*2) * (loc/60) - Math.PI/2,
      handRadius = isHour
                      ? RIM_RADIUS - HAND_TRUNCATION - HOUR_HAND_TRUNCATION
                      : RIM_RADIUS - HAND_TRUNCATION;
  context.beginPath();
  //context.moveTo(canvas.width/2 + Math.cos(angle) * handRadius,
  //               canvas.height/2 + Math.sin(angle) * handRadius);
  context.arc(canvas.width/2,
              canvas.height/2,
              handRadius,
              angle - tipRadians,
              angle + tipRadians,
              false);

  context.arc(canvas.width/2,
              canvas.height/2,
              CENTER_HUB_RADIUS,
              angle + baseRadians,
              angle - baseRadians,
              true);
  context.fillStyle = style;
  context.fill();
  context.restore();
}

function rubberbandStart(x, y) {
  mousedown.x = x;
  mousedown.y = y;
  rubberbandRectangle.left = mousedown.x;
  rubberbandRectangle.top = mousedown.y;
  moveRubberbandDiv();
  showRubberbandDiv();
  dragging = true;
}

function rubberbandStretch(x, y) {
  rubberbandRectangle.left = x < mousedown.x ? x : mousedown.x;
  rubberbandRectangle.top = y < mousedown.y ? y : mousedown.y;
  var smallerDim = Math.min(Math.abs(x - mousedown.x), Math.abs(y - mousedown.y));
  rubberbandRectangle.width = smallerDim;
  rubberbandRectangle.height = smallerDim;
  moveRubberbandDiv();
  resizeRubberbandDiv();
}

function rubberbandEnd() {
    console.log("rubberBandEnd");
  var smallerDim = Math.min(rubberbandRectangle.width, rubberbandRectangle.height);
  rubberbandDiv.style.width = rubberbandDiv.style.height = 0;
  hideRubberbandDiv();
  dragging = false;
  if (smallerDim < 5) {
    resetRubberbandRectangle();
  } else {
    zoomed = true;
  }
}

function moveRubberbandDiv() {
   rubberbandDiv.style.top  = rubberbandRectangle.top  + 'px';
   rubberbandDiv.style.left = rubberbandRectangle.left + 'px';
}

function resizeRubberbandDiv() {
   rubberbandDiv.style.width  = rubberbandRectangle.width  + 'px';
   rubberbandDiv.style.height = rubberbandRectangle.height + 'px';
}

function showRubberbandDiv() {
   rubberbandDiv.style.display = 'inline';
}

function hideRubberbandDiv() {
   rubberbandDiv.style.display = 'none';
}

function resetRubberbandRectangle() {
  zoomed = false;
  rubberbandRectangle = { top: 0, left: 0, width: 0, height: 0 };
}

canvas.onmousedown = function (e) {
   var x = e.x || e.clientX,
       y = e.y || e.clientY;
   e.preventDefault();
   if (zoomed == false) {
     rubberbandStart(x, y);
   }
};

canvas.onmouseout = function(e) {
    e.preventDefault();
    e.stopPropagation();
    resetRubberbandRectangle();
};

window.onmousemove = function (e) {
  var x = e.x || e.clientX,
      y = e.y || e.clientY;
  e.preventDefault();
  if (!zoomed && dragging) {
    rubberbandStretch(x, y);
  }
};

window.onmouseup = function (e) {
  e.preventDefault();
  if (dragging) {
      rubberbandEnd();
  }
};

window.onfocus = function(e) {
  updateTime();
  drawClock();
};

