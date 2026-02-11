let maxDepth = 50;
let skipChance;
let shrinkFactor = .999;
let rotationSpeed = .01;
let defaultStrokeWidth = 2;

function setup() {
  createCanvas(windowWidth, windowHeight);
  rectMode(CENTER);
  colorMode(HSB, 360, 100, 100, 1);
  noFill();

}

function draw() {
  background(0);
  translate(width/2, height/2);
  drawRecursiveRing(width * 1.5, 0, frameCount % 360, 0);

}

function drawRecursiveRing(size, angle, hue, depth) {
  if (size < 10 || depth > maxDepth) return;

  if (mouseIsPressed) {
    shrinkFactor = map(mouseX, 0, width, 0.8, 0.95); 
    rotationSpeed = map(mouseY, 0, height, 0.01, 0.2);
  }

  

  let isBlack = (random(1) < skipChance); 
  
  push();
  rotate(angle);
  
  if (!isBlack) {
    stroke(hue, 80, 100);
    strokeWeight(size * 0.05); 
    rect(0, 0, size, size);
  } else {

    stroke(hue, 0, 0); 
    strokeWeight(2);

  }
  pop();


  drawRecursiveRing(
    size * shrinkFactor,       // Smaller
    angle + rotationSpeed,     // Rotated
    (hue + 10) % 360,          // Hue Shifted
    depth + 1                  // Deeper
  );
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}