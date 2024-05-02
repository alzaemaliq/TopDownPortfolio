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

const imageSources = [
    './img/Beppu Town.png',
    './img/foregroundObjects.png',
    './img/Walk.png',
    './img/playerUp.png',
    './img/playerLeft.png',
    './img/playerRight.png',
    './img/blackSmith.png',
    './img/homeOwner.png',
    './img/gateGuardian.png'
];

function loadImages(imageSources, callback) {
    let loadedImages = 0;
    let totalImages = imageSources.length;
    let images = {};

    for (let src of imageSources) {
        const img = new Image();
        img.onload = function() {
            loadedImages++;
            images[src] = img;
            if (loadedImages === totalImages) {
                callback(images);
            }
        };
        img.src = src;
    }
}

loadImages(imageSources, function(loadedImages) {
    const backgroundImage = loadedImages['./img/Beppu Town.png'];
    const foregroundObjects = loadedImages['./img/foregroundObjects.png'];
    const playerImageDown = loadedImages['./img/Walk.png'];
    const playerImageUp = loadedImages['./img/playerUp.png'];
    const playerImageLeft = loadedImages['./img/playerLeft.png'];
    const playerImageRight = loadedImages['./img/playerRight.png'];
    const blackSmithImage = loadedImages['./img/blackSmith.png'];
    const homeOwnerImage = loadedImages['./img/homeOwner.png'];
    const gateGuardianImage = loadedImages['./img/gateGuardian.png'];

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
        constructor({ position, image, width = image.width, height = image.height, srcX = 0, srcY = 0, srcWidth = image.width, srcHeight = image.height }) {
            this.position = position;
            this.image = image;
            this.width = width;
            this.height = height;
            this.srcX = srcX;
            this.srcY = srcY;
            this.srcWidth = srcWidth;
            this.srcHeight = srcHeight;
        }
    
        get hitbox() {
            return {
                x: this.position.x,
                y: this.position.y,
                width: this.width,
                height: this.height
            };
        }
    
        draw() {
            c.drawImage(this.image, this.srcX, this.srcY, this.srcWidth, this.srcHeight, this.position.x, this.position.y, this.width, this.height);
        }
    }
    
    let initialForegroundX = 0;
    let initialForegroundY = 0;
    let additionalForegroundWidth = -1120;
    let additionalForegroundHeight = -640;
    let blackSmithInitialX = 673; // Your chosen offset from the background's starting x-position
    let blackSmithInitialY = 600; // Your chosen offset from the background's starting y-position
    let homeOwnerInitialX = 1657;
    let homeOwnerInitialY = 600;
    let gateGuardianInitialX = 2783;
    let gateGuardianInitialY = 600;

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
        height: foregroundObjects.height + additionalForegroundHeight,
        srcWidth: foregroundObjects.width,  // Use full image width
        srcHeight: foregroundObjects.height // Use full image height
    });
    

    const blackSmith = new Sprite({
        position: {
            x: background.position.x + blackSmithInitialX,
            y: background.position.y + blackSmithInitialY
        },
        image: blackSmithImage,
        srcX: 0,   // Starting X position on the sprite sheet
        srcY: 0,   // Starting Y position on the sprite sheet
        srcWidth: 48, // Width to crop
        srcHeight: 72, // Height to crop
        width: 48, // Displayed width
        height: 72 // Displayed height
    });     

    const homeOwner = new Sprite({
        position: {
            x: homeOwnerInitialX,  // Centering the sprite horizontally
            y: homeOwnerInitialY   // Centering the sprite vertically
        },
        image: homeOwnerImage,
        srcX: 0,
        srcY: 0,
        srcWidth: 48,
        srcHeight: 72,
        width: 48,
        height: 72
    });    

    const gateGuardian = new Sprite({
        position: {
            x: gateGuardianInitialX,  // Centering the sprite horizontally
            y: gateGuardianInitialY   // Centering the sprite vertically
        },
        image: gateGuardianImage,
        srcX: 0,
        srcY: 0,
        srcWidth: 48,
        srcHeight: 72,
        width: 48,
        height: 72
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

    let dialogueActive = false;

    function showDialogue(text) {
        const dialogueBox = document.getElementById('dialogue-box');
        const dialogueText = document.getElementById('dialogue-text');
        dialogueText.textContent = text;
        dialogueBox.style.display = 'block';
        dialogueActive = true;
    }

    function hideDialogue() {
        if (dialogueActive) {
            document.getElementById('dialogue-box').style.display = 'none';
            dialogueActive = false;
        }
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
            // Set the resting frame based on the direction when not moving
            if (player.currentDirection === 'right') {
                player.frameX = player.maxFrame; // last frame for right direction
            } else {
                player.frameX = 0; // first frame for all other directions
            }
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

        if (isColliding(player.hitbox, blackSmith.hitbox)) {
            showDialogue("Hello! I'm the blacksmith.");
        } else if (isColliding(player.hitbox, homeOwner.hitbox)) {
            showDialogue("Welcome to my home!");
        } else if (isColliding(player.hitbox, gateGuardian.hitbox)) {
            showDialogue("I guard this gate! Nobody shall pass without proper clearance.");
        } else {
            hideDialogue();  // Hide dialogue if no collision with any NPC
        }

        foreground.position.x = background.position.x + initialForegroundX;
        foreground.position.y = background.position.y + initialForegroundY;
        blackSmith.position.x = background.position.x + blackSmithInitialX;
        blackSmith.position.y = background.position.y + blackSmithInitialY;
        homeOwner.position.x = background.position.x + homeOwnerInitialX;
        homeOwner.position.y = background.position.y + homeOwnerInitialY;
        gateGuardian.position.x = background.position.x + gateGuardianInitialX;
        gateGuardian.position.y = background.position.y + gateGuardianInitialY;

        background.draw();
        blackSmith.draw();
        homeOwner.draw();
        gateGuardian.draw();
        boundaries.forEach(boundary => boundary.draw({x: background.position.x, y: background.position.y}));

        const playerImage = player.currentDirection === 'up' ? playerImageUp :
                            player.currentDirection === 'left' ? playerImageLeft :
                            player.currentDirection === 'right' ? playerImageRight :
                            playerImageDown;  // Default to moving down

        c.drawImage(playerImage, player.frameX * player.width, player.frameY * player.height, player.width, player.height, player.x, player.y, player.width, player.height);
        foreground.draw();
    }

    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();  // Convert key input to lowercase
        if (['w', 'a', 's', 'd'].includes(key) && !keysPressed.includes(key)) {
            keysPressed.push(key);
            updateMovement();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();  // Convert key input to lowercase
        if (['w', 'a', 's', 'd'].includes(key)) {
            keysPressed = keysPressed.filter(k => k !== key);
            updateMovement();
        }
    });
    
    // Start animation
    animate();
});
