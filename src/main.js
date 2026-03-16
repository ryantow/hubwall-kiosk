/**
 * CAPITAL ONE HUBWALL KIOSK - MAIN LOGIC
 */

// 1. Global State
let currentIndex = 0;
let idleTimer;
let touchStartX = 0;
let touchEndX = 0;
const minSwipeDistance = 50; // Pixels required to trigger a slide

// 2. Initialization (Wait for HTML to load)
window.addEventListener('DOMContentLoaded', () => {
    console.log("Kiosk Initialized...");
    
    // Initial Scale check
    setScale();

    // Set up the Start Button
    const startBtn = document.getElementById('start-button');
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            console.log("Start Clicked -> Moving to Screen 1");
            goToScreen(1);
        });
    } else {
        console.error("Critical Error: 'start-button' not found in HTML!");
    }

    // Set up Global Input Listeners for Idle Reset
    window.addEventListener('mousedown', (e) => {
        touchStartX = e.screenX; // For swipe tracking
        resetIdleTimer();
    });

    window.addEventListener('mouseup', (e) => {
        touchEndX = e.screenX; // For swipe tracking
        handleGesture();
    });

    window.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
        resetIdleTimer();
    });

    window.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleGesture();
    });

    // Handle Window Resizing (Laptop Dev Mode)
    window.addEventListener('resize', setScale);
});

// 3. Navigation Engine
function goToScreen(index) {
    const ribbon = document.getElementById('ribbon');
    const navContainer = document.getElementById('nav-container');
    const dots = document.querySelectorAll('.dot');
    const leftArrow = document.querySelector('.left-arrow');
    const rightArrow = document.querySelector('.right-arrow');

    currentIndex = index;
    ribbon.style.setProperty('--current-index', currentIndex);

    // 1. Show/Hide Nav UI based on Screen 0
    if (currentIndex === 0) {
        navContainer.style.display = 'none';
    } else {
        navContainer.style.display = 'flex';
    }

    // 2. Update Dot Highlights
    dots.forEach((dot, i) => {
        // Since dots represent screens 1-6, index is i + 1
        if (i + 1 === currentIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    // 3. Arrow Visibility End-Caps
    // Hide left arrow on Screen 1
    if (currentIndex === 1) leftArrow.classList.add('hidden');
    else leftArrow.classList.remove('hidden');

    // Hide right arrow on Screen 6
    if (currentIndex === 6) rightArrow.classList.add('hidden');
    else rightArrow.classList.remove('hidden');

    resetIdleTimer();
}

// 4. Swipe Detection
function handleGesture() {
    // LOCK: Do not allow swiping on the Welcome screen (Index 0)
    if (currentIndex === 0) return;

    const swipeDistance = touchEndX - touchStartX;

    if (swipeDistance < -minSwipeDistance) {
        // Swiped Left -> Next
        if (currentIndex < 6) goToScreen(currentIndex + 1);
    } else if (swipeDistance > minSwipeDistance) {
        // Swiped Right -> Previous
        if (currentIndex > 1) goToScreen(currentIndex - 1);
    }
}

// 5. Scaling Logic (For Laptop Testing)
function setScale() {
    const wrapper = document.getElementById('scale-wrapper');
    if (!wrapper) return;

    const targetWidth = 3840;
    const targetHeight = 2160;
    
    const scale = Math.min(
        window.innerWidth / targetWidth,
        window.innerHeight / targetHeight
    );
    
    wrapper.style.transform = `scale(${scale})`;
}

// 6. Inactivity Timer
function resetIdleTimer() {
    clearTimeout(idleTimer);
    
    // Only start timer if we are NOT on the Welcome screen
    if (currentIndex !== 0) {
        idleTimer = setTimeout(() => {
            console.log("120s Idle Reached. Resetting to Welcome...");
            goToScreen(0);
        }, 120000); 
    }
}

function navNext() {
    if (currentIndex < 6) goToScreen(currentIndex + 1);
}

function navPrev() {
    if (currentIndex > 1) goToScreen(currentIndex - 1);
}

// Disables the right-click context menu globally
window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
}, false);

async function loadKioskConfig() {
    try {
        // Fetch the config file (Electron allows fetching local files if configured)
        const response = await fetch('./config.json');
        const config = await response.json();

        // 1. Update the Map Image
        const mapImg = document.getElementById('dynamic-map');
        if (mapImg) {
            // Assumes images follow naming pattern: H_MAP_KIOSKID.png
            mapImg.src = `src/assets/images/maps/H_MAP_${config.kiosk_id}.png`;
        }

        // 2. Store config globally for later (Data Tracking)
        window.KioskSettings = config; 
        console.log(`Kiosk ${config.kiosk_id} Ready.`);

    } catch (err) {
        console.error("Config load failed. Falling back to default map.", err);
    }
}

// Run this when the app starts
window.addEventListener('DOMContentLoaded', loadKioskConfig);

// --- UPDATED PHYSICS ENGINE ---
let startX = 0;
let isDragging = false;
let startTime = 0;
const viewWidth = 2600; // MUST MATCH --view-width in CSS

const ribbon = document.getElementById('ribbon');

ribbon.addEventListener('touchstart', (e) => {
    // If on Screen 0, we only allow the button to work, no swiping
    if (currentIndex === 0) return;

    startX = e.touches[0].clientX;
    startTime = new Date().getTime();
    isDragging = true;
    
    // Kill transition for 1:1 finger tracking
    ribbon.style.transition = 'none'; 
});

ribbon.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX;
    
    // RUBBER BAND LOGIC
    // Apply 0.3 friction if pulling past the edges (Screen 1 or Screen 6)
    let dragDistance = diff;
    if ((currentIndex === 1 && diff > 0) || (currentIndex === 6 && diff < 0)) {
        dragDistance = diff * 0.3; 
    }

    // Calculate current position: (Index * -Width) + current finger offset
    const currentTranslate = (currentIndex * -viewWidth) + dragDistance;
    
    // Update the position in real-time using the CSS variable or direct transform
    ribbon.style.transform = `translateX(${currentTranslate}px)`;
});

ribbon.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;

    const endX = e.changedTouches[0].clientX;
    const endTime = new Date().getTime();
    
    const movedBy = endX - startX;
    const duration = endTime - startTime;
    
    // Velocity calculation (pixels per millisecond)
    const velocity = Math.abs(movedBy) / duration;

    // Reset transition for the "Snap"
    ribbon.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

    // DECISION LOGIC: Did they move far enough OR flick fast enough?
    if (Math.abs(movedBy) > viewWidth / 4 || velocity > 0.5) {
        if (movedBy > 30 && currentIndex > 1) {
            goToScreen(currentIndex - 1);
        } else if (movedBy < -30 && currentIndex < 6) {
            goToScreen(currentIndex + 1);
        } else {
            // If they tried to swipe past boundaries, snap back
            goToScreen(currentIndex);
        }
    } else {
        // Not enough movement: Snap back to current
        goToScreen(currentIndex);
    }
});