const canvas = document.querySelector('canvas');
const c = canvas.getContext('2d');
canvas.width = 1024;
canvas.height = 576;

const collisionsMap = [];
for (let i = 0; i < collisions.length; i += 70) {
    collisionsMap.push(collisions.slice(i, 70 + i));
}

class Boundary {
    static width = 48;
    static height = 48;
    constructor(position) {
        this.position = position;
        this.width = Boundary.width;
        this.height = Boundary.height;
    }

    draw(offset) {
        c.fillStyle = 'rgba(0, 0, 0, 0)'; // For boundary visibility during debugging
        c.fillRect(this.position.x + offset.x, this.position.y + offset.y, this.width, this.height);
    }
}

const boundaries = collisionsMap.flatMap((row, i) => 
    row.map((symbol, j) => symbol === 3967 ? new Boundary({
        x: j * Boundary.width,
        y: i * Boundary.height
    }) : null).filter(b => b)
);

const backgroundImage = new Image();
backgroundImage.src = './img/Beppu Town.png';

const foregroundObjects = new Image();
foregroundObjects.src = './img/foregroundObjects.png';

// Player images for different directions
const playerImageDown = new Image();
playerImageDown.src = './img/Walk.png'; // For moving down
const playerImageUp = new Image();
playerImageUp.src = './img/playerUp.png'; // For moving up
const playerImageLeft = new Image();
playerImageLeft.src = './img/playerLeft.png'; // For moving left
const playerImageRight = new Image();
playerImageRight.src = './img/playerRight.png'; // For moving right

let playerY = 330;

const player = {
    width: 48,
    height: 72,
    frameX: 0,
    frameY: 0,
    maxFrame: 3,
    ticksPerFrame: 8,
    tickCount: 0,
    currentDirection: 'down',
    get x() {
        return (canvas.width - this.width) / 2;
    },
    get y() {
        return playerY;
    },
    get hitbox() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
};

class Sprite {
    constructor({ position, image, width = image.width, height = image.height }) {
        this.position = position;
        this.image = image;
        this.width = width;
        this.height = height;
    }

    draw() {
        c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
    }
}

let initialForegroundX = 0;
let initialForegroundY = 0;
let additionalForegroundWidth = -1120;
let additionalForegroundHeight = -640;

const background = new Sprite({
    position: {
        x: (canvas.width - backgroundImage.width) / 2,
        y: -1300
    },
    image: backgroundImage
});

const foreground = new Sprite({
    position: {
        x: (canvas.width - foregroundObjects.width) / 2 + initialForegroundX,
        y: initialForegroundY
    },
    image: foregroundObjects,
    width: foregroundObjects.width + additionalForegroundWidth,
    height: foregroundObjects.height + additionalForegroundHeight
});

const keys = {
    w: { pressed: false },
    a: { pressed: false },
    s: { pressed: false },
    d: { pressed: false }
};

let keysPressed = [];

function isColliding(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function updateMovement() {
    keys.w.pressed = false;
    keys.a.pressed = false;
    keys.s.pressed = false;
    keys.d.pressed = false;

    if (keysPressed.length > 0) {
        const lastKey = keysPressed[keysPressed.length - 1];
        keys[lastKey].pressed = true;
    }
}

function animate() {
    window.requestAnimationFrame(animate);
    c.clearRect(0, 0, canvas.width, canvas.height);

    let newX = background.position.x;
    let newY = background.position.y;
    const speed = 3;

    if (keys.w.pressed) {
        newY += speed;
        player.currentDirection = 'up';
    }
    if (keys.s.pressed) {
        newY -= speed;
        player.currentDirection = 'down';
    }
    if (keys.a.pressed) {
        newX += speed;
        player.currentDirection = 'left';
    }
    if (keys.d.pressed) {
        newX -= speed;
        player.currentDirection = 'right';
    }

    if (keys.w.pressed || keys.s.pressed || keys.a.pressed || keys.d.pressed) {
        player.tickCount++;
        if (player.tickCount > player.ticksPerFrame) {
            player.tickCount = 0;
            if (player.frameX < player.maxFrame) {
                player.frameX++;
            } else {
                player.frameX = 0;
            }
        }
    } else {
        player.frameX = 0;
    }

    let collisionDetected = boundaries.some(boundary => isColliding(player.hitbox, {
        x: boundary.position.x + newX,
        y: boundary.position.y + newY,
        width: boundary.width,
        height: boundary.height
    }));

    if (!collisionDetected) {
        background.position.x = newX;
        background.position.y = newY;
    }

    foreground.position.x = background.position.x + initialForegroundX;
    foreground.position.y = background.position.y + initialForegroundY;

    background.draw();
    boundaries.forEach(boundary => boundary.draw({x: background.position.x, y: background.position.y}));

    const playerImage = player.currentDirection === 'up' ? playerImageUp :
                        player.currentDirection === 'left' ? playerImageLeft :
                        player.currentDirection === 'right' ? playerImageRight :
                        playerImageDown;  // Default to moving down

    c.drawImage(playerImage, player.frameX * player.width, player.frameY * player.height, player.width, player.height, player.x, player.y, player.width, player.height);
    foreground.draw();
}

animate();

window.addEventListener('keydown', (e) => {
    if (['w', 'a', 's', 'd'].includes(e.key) && !keysPressed.includes(e.key)) {
        keysPressed.push(e.key);
        updateMovement();
    }
});

window.addEventListener('keyup', (e) => {
    if (['w', 'a', 's', 'd'].includes(e.key)) {
        keysPressed = keysPressed.filter(key => key !== e.key);
        updateMovement();
    }
});
