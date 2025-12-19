(function () {
    console.log("Cat extension content script execution started.");
    // Check if cat already exists, if so, remove it (Toggle functionality)
    if (window.catExtensionActive) {
        console.log("Cat extension already active, toggling off.");
        const existingCat = document.querySelector('.cat-container');
        if (existingCat) existingCat.remove();
        window.catExtensionActive = false;
        window.removeEventListener('mousemove', window.catMouseMoveHandler);
        if (window.catAnimFrame) cancelAnimationFrame(window.catAnimFrame);
        return;
    }

    console.log("Initializing Cat extension...");
    window.catExtensionActive = true;

    // Configuration
    const SPEED = 3.75; // Pixels per frame (reduced by 25%)
    const FRAME_RATE = 8; // Updates per second approx (for animation)
    const REACH_THRESHOLD = 10; // Distance to stop running (closer reach)

    // State
    let start = null;
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let catX = mouseX;
    let catY = mouseY;
    let frameIndex = 0;
    let lastFrameTime = 0;

    // Create Cat Element
    const cat = document.createElement('div');
    cat.classList.add('cat-container');
    // Initial size, can be adjusted in CSS or here
    cat.style.width = '100px';
    cat.style.height = '100px';
    document.body.appendChild(cat);

    // Mouse Handler
    window.catMouseMoveHandler = (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    };
    window.addEventListener('mousemove', window.catMouseMoveHandler);

    // Animation Loop
    function update(timestamp) {
        if (!window.catExtensionActive) return;

        // Calculate distance
        const dx = mouseX - catX;
        const dy = mouseY - catY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Movement
        if (distance > REACH_THRESHOLD) {
            // Move towards mouse
            const angle = Math.atan2(dy, dx);
            const moveX = Math.cos(angle) * SPEED;
            const moveY = Math.sin(angle) * SPEED;

            catX += moveX;
            catY += moveY;
        }
        // If very close, just snap or stay? 
        // Let's just stop moving when close enough.

        // Direction and Frame Logic
        const angle = Math.atan2(dy, dx) * (180 / Math.PI);

        // Initialize persistent direction
        if (!window.catDirection) window.catDirection = "Right";

        if (distance > REACH_THRESHOLD) {
            if (angle > -22.5 && angle <= 22.5) window.catDirection = "Right";
            else if (angle > 22.5 && angle <= 67.5) window.catDirection = "BottomRight";
            else if (angle > 67.5 && angle <= 112.5) window.catDirection = "Down";
            else if (angle > 112.5 && angle <= 157.5) window.catDirection = "BottomLeft";
            else if (angle > 157.5 || angle <= -157.5) window.catDirection = "Left";
            else if (angle > -157.5 && angle <= -112.5) window.catDirection = "TopLeft";
            else if (angle > -112.5 && angle <= -67.5) window.catDirection = "UP";
            else if (angle > -67.5 && angle <= -22.5) window.catDirection = "TopRight";
        }

        const direction = window.catDirection;

        const SPRITE_DATA = {
            "Left": { size: [32, 28], frames: [[129, 64], [128, 99]] },
            "Right": { size: [32, 28], frames: [[95, 0], [96, 33]] },
            "UP": { size: [32, 32], frames: [[32, 64], [32, 96]] },
            "Down": { size: [32, 32], frames: [[193, 96], [224, 63]] },
            "TopLeft": { size: [32, 32], frames: [[34, 0], [33, 30]] },
            "TopRight": { size: [32, 32], frames: [[0, 64], [0, 96]] },
            "BottomLeft": { size: [32, 32], frames: [[160, 96], [128, 96]] },
            "BottomRight": { size: [32, 32], frames: [[160, 33], [162, 62]] }
        };

        // Frame Animation logic
        if (timestamp - lastFrameTime > (1000 / 20)) { // ~20 fps animation (Doubled speed)
            lastFrameTime = timestamp;

            let posX, posY;
            let frameWidth = 32;
            let frameHeight = 32;

            // --- MAIN STATE MACHINE ---

            if (distance > REACH_THRESHOLD) {
                // RUNNING
                window.catIsIdle = false;
                const data = SPRITE_DATA[direction];
                const frameNum = (frameIndex % 2);
                frameIndex++;
                [posX, posY] = data.frames[frameNum];

                // Use correct frame size for running
                frameWidth = data.size[0];
                frameHeight = data.size[1];
            } else {
                // IDLE
                if (!window.catIsIdle) {
                    // ... standard idle start ...
                    window.catIsIdle = true;
                    window.catReachTime = timestamp;
                    frameIndex = 0;
                }

                const timeSinceReach = timestamp - window.catReachTime;

                if (timeSinceReach < 2000) {
                    // Phase 1: Still (96, 96)
                    posX = 96;
                    posY = 96;
                } else {
                    // Phase 2: Animation
                    const idleTime = timeSinceReach - 2000;

                    if (idleTime < 200) {
                        // Transition (96, 63) - only once (slower: 200ms)
                        posX = 96;
                        posY = 63;
                    } else {
                        // Loop (64, 0) and (64, 32) (slower: 200ms toggle)
                        const loopFrame = Math.floor((idleTime - 200) / 200) % 2;
                        if (loopFrame === 0) {
                            posX = 64;
                            posY = 0;
                        } else {
                            posX = 64;
                            posY = 32;
                        }
                    }
                }
            }

            // Store for centering logic
            window.catRenderWidth = frameWidth;
            window.catRenderHeight = frameHeight;

            let spriteUrl;
            try {
                spriteUrl = chrome.runtime.getURL(`NewFrames/download.png`);
            } catch (e) {
                console.log("Cat extension: Context invalidated, stopping.");
                window.catExtensionActive = false;
                return;
            }

            cat.style.backgroundImage = `url("${spriteUrl}")`;
            cat.style.width = `${frameWidth}px`;
            cat.style.height = `${frameHeight}px`;
            cat.style.backgroundPosition = `-${posX}px -${posY}px`;
            cat.style.backgroundSize = `256px 128px`;
            cat.style.transform = `scale(1.25)`;
            cat.style.transformOrigin = 'center center';
            cat.style.imageRendering = 'pixelated';
        }

        // Apply Position (Centering)
        const rW = window.catRenderWidth || 32;
        const rH = window.catRenderHeight || 32;
        // Centering offset = (Width * Scale) / 2
        // Scale is 1.25, so factor is 0.625
        cat.style.left = `${catX - (rW * 0.625)}px`;
        cat.style.top = `${catY - (rH * 0.625)}px`;

        window.catAnimFrame = requestAnimationFrame(update);
    }

    try {
        window.catAnimFrame = requestAnimationFrame(update);
    } catch (e) {
        console.error("Cat extension start error:", e);
    }

})();
