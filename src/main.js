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