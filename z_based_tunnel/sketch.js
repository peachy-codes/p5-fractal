// --- CONFIGURATION ---
const config = {
  speed: 1,             
  nodeInterval: 10,    
  focalLength: 60,      
  viewDistance: 2000,   
  tunnelSize: 300,      
  rotationSpeed: .20,
  colorShift: 5,
  initialHue: 0,
  scaleFactor: 0.99999
};

function setupGui() {
  let gui = new dat.GUI();
  
  // gui.add(object, property, min, max, [step])
  gui.add(config, 'speed', -2, 2).name('Speed');
  gui.add(config, 'nodeInterval', 2, 100).name('Node Interval');
  gui.add(config, 'focalLength', 10, 200).name('Focal Length');
  gui.add(config, 'viewDistance', 500, 6000).name('View Dist');
  gui.add(config, 'tunnelSize', 10, 500).name('Base Size');
  gui.add(config, 'rotationSpeed', 0, 0.2).name('Rotation');
  gui.add(config, 'colorShift', 0, 360).name('Color Shift');
  gui.add(config, 'initialHue', 0, 360).name('Initial Hue');
  // Special handling for Scale Factor (make the range sensitive)
  gui.add(config, 'scaleFactor', 0.9, 1.1).step(0.001).name('Scale Factor');
}

// --- GLOBAL STATE ---
let rootNode;          
let activeTip; 
let cam = { x: 0, y: 0, z: 0 }; 

function setup() {
  createCanvas(windowWidth, windowHeight);
  colorMode(HSB, 360, 100, 100, 1);
  
  // Initialize with angle 0 and hue 0
  rootNode = new Node(0, 0, 0, config.tunnelSize, 0, config.initialHue, false);
  activeTip = rootNode;
  setupGui(); // <--- Add this line

}

function draw() {
  background(0); 
  
  cam.z += config.speed;
  
  // Camera follows the single path
  let targetNode = findGuideNode(rootNode, cam.z + 400);
  if (targetNode) {
    cam.x = lerp(cam.x, targetNode.x, 0.5);
    cam.y = lerp(cam.y, targetNode.y, 0.5);
  }

  updateWorldState();
  pruneWorldState();

  push();
  translate(width/2, height/2); 
  renderTree(rootNode);
  pop();
}

// ==========================================
//      LOGIC: RENDER
// ==========================================

function renderTree(node) {
  // Optimization: Stop recursion if node is too far
  if (node.z - cam.z > config.viewDistance) return;

  // Render children (there is only ever 1 now)
  for (let child of node.children) {
    renderTree(child);
  }

  let myProj = project(node);
  
  // --- FIX ---
  // Check if the node is behind the camera (Relative Z)
  if (node.z - cam.z < -config.nodeInterval) return; 

  // Draw connection to the child (if it exists)
  if (node.children.length > 0) {
    let childProj = project(node.children[0]);
    drawConnection(myProj, childProj);
  }
}
function shiftWorldOrigin(offset) {
  // 1. Shift Camera
  cam.z -= offset;

  // 2. Recursive Shift for all nodes
  // We use a helper recursion to traverse the entire active tree
  function shiftNodeRecursive(node) {
    node.z -= offset;
    for (let child of node.children) {
      shiftNodeRecursive(child);
    }
  }
  
  shiftNodeRecursive(rootNode);
}
function drawConnection(front, back) {
let hue = front.hue;
  
  // Use the flag to decide the Fill Color
  if (front.isBlack) {
    fill(0); // Pure Black Fill
  } else {
    fill(hue, 100, 100, 0.3); // Normal Color Fill
  }

  // Keep stroke colored so you can see the "wireframe" of the black section
  stroke(hue, 100, 100, 1); 
  strokeWeight(2);
  quad(front.tl.x, front.tl.y, front.tr.x, front.tr.y, back.tr.x, back.tr.y, back.tl.x, back.tl.y);
  quad(front.tr.x, front.tr.y, front.br.x, front.br.y, back.br.x, back.br.y, back.tr.x, back.tr.y);
  quad(front.br.x, front.br.y, front.bl.x, front.bl.y, back.bl.x, back.bl.y, back.br.x, back.br.y);
  quad(front.bl.x, front.bl.y, front.tl.x, front.tl.y, back.tl.x, back.tl.y, back.bl.x, back.bl.y);
}



function project(node) {
  let relZ = node.z - cam.z;
  let effectiveZ = max(relZ, 1); 

  let scale = .5 * (config.focalLength / effectiveZ);
  let sx = (node.x - cam.x) * scale;
  let sy = (node.y - cam.y) * scale;
  let r = (node.size * scale) / 4; // Adjusted size divisor for single tunnel look

  let ang = node.angle; 
  let ca = cos(ang);
  let sa = sin(ang);

  function rot(rx, ry) {
    return {
      x: sx + (rx * ca - ry * sa),
      y: sy + (rx * sa + ry * ca)
    };
  }

  return {
    tl: rot(-r, -r),
    tr: rot(r, -r),
    br: rot(r, r),
    bl: rot(-r, r),
    z: node.z,
    hue: node.hue,
    isBlack: node.isBlack
  };
}

function updateWorldState() {
  if (activeTip.z < cam.z + config.viewDistance) {
    let nextZ = activeTip.z + config.nodeInterval;
    
    let noiseScale = 0; 
    let nextX = map(noise(nextZ * noiseScale), 0, 1, -2000, 2000);
    let nextY = map(noise(nextZ * noiseScale + 100), 0, 1, -1000, 1000);
    let nextHue = (activeTip.hue + config.colorShift) % 360;
    let nextAngle = activeTip.angle + config.rotationSpeed;
    let nextIsBlack = random(1) < 0.05;


    let nextSize = activeTip.size * config.scaleFactor; 
    
    let nextNode = new Node(nextX, nextY, nextZ, nextSize, nextAngle, nextHue, nextIsBlack);
    
    activeTip.children.push(nextNode);
    activeTip = nextNode;
  }
}

class Node {
  constructor(x, y, z, s, a, h, isBlack) { // Added 'h' argument
    this.x = x; 
    this.y = y; 
    this.z = z; 
    this.size = s;
    this.angle = a || 0;
    this.hue = h || 0; 
    this.isBlack = isBlack || false;
    this.children = [];
  }
}

function pruneWorldState() {
  // Original pruning logic (keep this)
  if (rootNode.z < cam.z - config.nodeInterval * 2) { // Increased buffer slightly
    if (rootNode.children.length > 0) {
      rootNode = rootNode.children[0];
    }
  }


  if (cam.z > 5000) {
    shiftWorldOrigin(5000);
  }
}

function findGuideNode(node, targetZ) {
  if (!node) return null;
  if (node.z >= targetZ) return node;
  if (node.children.length > 0) return findGuideNode(node.children[0], targetZ);
  return node;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}