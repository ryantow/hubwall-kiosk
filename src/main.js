/**
 * CAPITAL ONE HUBWALL KIOSK - MASTER CONTROLLER
 * Handles: Physics-based navigation, External Config, and Touch Safety.
 */

// 1. GLOBAL STATE & SPECS
let currentIndex = 0;
let idleTimer;
const viewWidth = 2600; // MUST MATCH CSS --view-width
let isDragging = false;
let startX = 0;
let startTime = 0;

// Kiosk Location Lookup (Synced from your CSV)
const KIOSK_LOCATIONS = {
    '59LEX': '59th & Lexington', 'BACKBAY': 'Back Bay', 'CC-PLAZA': 'Country Club Plaza',
    'COLCIR': 'Columbus Circle', 'EASTVIEW': 'Eastview Mall', 'FASHOW': 'Fashion Show',
    'FLORIDA-MALL': 'Florida Mall', 'GEORGETOWN': 'Georgetown', 'GULFGATE': 'Gulfgate Center Mall',
    'HARVARD-SQ': 'Harvard Square', 'HERALD-SQ': 'Herald Square', 'HOU-GALLERIA': 'Houston Galleria',
    'IRVINE-SP': 'Irvine Spectrum', 'KOP': 'King of Prussia', 'LA-CANTERA': 'La Cantera',
    'MIAMI-BEACH': 'Miami Beach', 'MOA': 'Mall of America', 'ROSS-PARK': 'Ross Park Mall',
    'SOHO': 'Soho', 'SOUTHCENTER': 'Southcenter Mall', 'ST-SOUTHPOINT': 'Streets at Southpoint',
    'STONEBRIAR': 'Stonebriar Centre', 'UNION-SQ': 'Union Square (NYC)', 'UNION-STATION': 'Union Station LoDo',
    'UPTOWN-DAL': 'Uptown Dallas (West Village)', 'VALLEY-FAIR': 'Valley Fair', 'VICTORIA-GARDENS': 'Victoria Gardens',
    'WEST-COUNTY': 'West County', 'WOODLANDS': 'Woodlands Mall', 'WYNNEWOOD': 'Wynnewood Village',
    'DT-AUSTIN': 'Downtown Austin', 'SCOTTSDALE': 'Scottsdale', 'STATE-STREET': 'State Street'
};

// 2. INITIALIZATION
window.addEventListener('DOMContentLoaded', () => {
    console.log("Kiosk Engine Initializing...");
    
    setScale();
    loadKioskConfig();

    const ribbon = document.getElementById('ribbon');
    const startBtn = document.getElementById('start-button');
    const restartBtn = document.getElementById('restart-button');

    // --- BUTTON HANDLERS ---
    if (startBtn) {
        startBtn.addEventListener('click', () => goToScreen(1));
    }

// --- RESTART BUTTON (SCREEN 6) ---
    if (restartBtn) {
        const handleRestart = async (e) => {
            e.stopPropagation(); 
            e.stopImmediatePropagation();
            if (e.cancelable) e.preventDefault();
            
            try {
                // 1. Log the explicit restart click
                if (typeof logRestartClick === 'function') {
                    await logRestartClick();
                }
                
                // 2. Log the session as successfully completed
                if (typeof endSession === 'function') {
                    await endSession(false); 
                }
            } catch (err) {
                console.error("Analytics fetch failed, resetting anyway:", err);
            }

            // 3. Navigate back to attractor
            goToScreen(0);
        };

        restartBtn.addEventListener('touchstart', handleRestart, true);
        restartBtn.addEventListener('mousedown', handleRestart, true);
    }
    
    // --- PHYSICS ENGINE (TOUCH GESTURES) ---
    ribbon.addEventListener('touchstart', (e) => {
        // UNIVERSAL UI GATE: Never swipe if touching a button, dot, or arrow
        if (e.target.closest('button') || e.target.closest('.dot') || e.target.closest('.nav-arrow')) {
            isDragging = false;
            return;
        }
       
        if (currentIndex === 0) return; 
        isDragging = true;
        startX = e.touches[0].clientX;
        startTime = new Date().getTime();
        ribbon.style.transition = 'none'; 
    });

    ribbon.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        
        // RUBBER BANDING (Friction at Screen 1 and 6)
        let dragDistance = diff;
        if ((currentIndex === 1 && diff > 0) || (currentIndex === 6 && diff < 0)) {
            dragDistance = diff * 0.3; 
        }

        const translateValue = (currentIndex * -viewWidth) + dragDistance;
        ribbon.style.transform = `translateX(${translateValue}px)`;
    });

    ribbon.addEventListener('touchend', (e) => {
        if (!isDragging) return;
        isDragging = false;
        if (e.cancelable) e.preventDefault(); // Kill ghost clicks

        const endX = e.changedTouches[0].clientX;
        const movedBy = endX - startX;
        const duration = new Date().getTime() - startTime;
        const velocity = Math.abs(movedBy) / duration;

        // Snap animation
        requestAnimationFrame(() => {
            ribbon.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';

            // Did they swipe far enough (20%) or flick fast enough?
            if (Math.abs(movedBy) > (viewWidth * 0.2) || velocity > 0.8) {
                if (movedBy > 50 && currentIndex > 1) goToScreen(currentIndex - 1);
                else if (movedBy < -50 && currentIndex < 6) goToScreen(currentIndex + 1);
                else goToScreen(currentIndex);
            } else {
                goToScreen(currentIndex); // Snap back
            }
        });
    });

    // --- GLOBAL EVENTS ---
    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('mousedown', resetIdleTimer);
    window.addEventListener('resize', setScale);
});

// 3. NAVIGATION CORE
function goToScreen(index) {
    const ribbon = document.getElementById('ribbon');
    const navContainer = document.getElementById('nav-container');
    const dots = document.querySelectorAll('.dot');
    const leftArrow = document.querySelector('.left-arrow');
    const rightArrow = document.querySelector('.right-arrow');

    console.log(`Navigating to screen: ${index}`);
    
    // --- METRICS: TRACK START & DEPTH ---
    const previousIndex = currentIndex;
    currentIndex = index;

    if (previousIndex === 0 && currentIndex > 0) {
        // User left the attractor screen
        if (typeof startSession === 'function') startSession();
    }
    
    if (currentIndex > 0) {
        // Log how far into the ribbon they are looking
        if (typeof updateScreenDepth === 'function') updateScreenDepth(currentIndex);
    }
    // ------------------------------------

    document.body.setAttribute('data-screen', currentIndex);

    // Apply Transition & Transform
    ribbon.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    ribbon.style.transform = `translateX(${currentIndex * -viewWidth}px)`;
    ribbon.style.setProperty('--current-index', currentIndex);

    // Toggle Nav Bar
    if (navContainer) {
        navContainer.style.display = (currentIndex === 0) ? 'none' : 'flex';
    }

    // Update Dots
    dots.forEach((dot, i) => {
        (i + 1 === currentIndex) ? dot.classList.add('active') : dot.classList.remove('active');
    });
    
    // Toggle Arrows
    if (leftArrow) leftArrow.classList.toggle('hidden', currentIndex === 1 || currentIndex === 0);
    if (rightArrow) rightArrow.classList.toggle('hidden', currentIndex === 6 || currentIndex === 0);

    resetIdleTimer();
}

// 4. CONFIG & EXTERNAL ASSETS
async function loadKioskConfig() {
    try {
        // Use browser-safe fetch instead of Node.js 'require'
        const response = await fetch('./config.json');
        
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const config = await response.json();
        
        // Handle both lowercase (original) or uppercase (new) key formats
        const id = config.kiosk_id || config.KIOSK_ID; 
        window.KioskSettings = config; 

        // Update the dynamic map image
        const mapImg = document.getElementById('dynamic-map');
       const mapCode = id.replace('hubwall_', ''); // strips the prefix just for the image
if (mapImg) mapImg.src = `src/assets/images/maps/H_MAP_${mapCode}.png`;
        
        // Update diagnostic UI
        const diagId = document.getElementById('diag-id');
        const diagName = document.getElementById('diag-name');
        
        if (diagId) diagId.textContent = id;
        if (diagName && typeof KIOSK_LOCATIONS !== 'undefined') {
            diagName.textContent = KIOSK_LOCATIONS[id] || "Unknown Location";
        }

        // Retain dev key logic
        if (typeof kioskKeys !== 'undefined') {
            const realIndex = kioskKeys.indexOf(id);
            if (realIndex !== -1) devKioskIndex = realIndex;
        }

        console.log("System Ready: ", id);
        return config; 

    } catch (err) { 
        console.error("Critical: Could not read config.json via fetch.", err); 
    }
}

// 5. UTILITIES
function setScale() {
    const wrapper = document.getElementById('scale-wrapper');
    if (!wrapper) return;
    const scale = Math.min(window.innerWidth / 3840, window.innerHeight / 2160);
    wrapper.style.transform = `scale(${scale})`;
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (currentIndex !== 0) {
        idleTimer = setTimeout(async () => {
            console.log("Inactivity timeout triggered.");
            
            if (typeof endSession === 'function') {
                try {
                    // THE FIX: If they are on screen 6, it's a Complete. Otherwise, Abandon.
                    const isAbandoned = (currentIndex !== 6);
                    await endSession(isAbandoned); 
                } catch (err) {
                    console.error("Analytics fetch failed, resetting anyway:", err);
                }
            }
            
            goToScreen(0);
        }, 20000); // 20 sec idle
    }
}

// Global Nav Wrappers for HTML onclick
function navNext() { if (currentIndex < 6) goToScreen(currentIndex + 1); }
function navPrev() { if (currentIndex > 1) goToScreen(currentIndex - 1); }

// Prevent right-click context menu
window.addEventListener('contextmenu', (e) => e.preventDefault(), false);


// ==========================================
// 6. DEV TOOLS & DIAGNOSTICS
// ==========================================
const kioskKeys = Object.keys(KIOSK_LOCATIONS);
let devKioskIndex = 0;

function applyKioskId(id) {
    const mapImg = document.getElementById('dynamic-map');
    if (mapImg) mapImg.src = `src/assets/images/maps/H_MAP_${id}.png`;
    
    const diagId = document.getElementById('diag-id');
    const diagName = document.getElementById('diag-name');
    if (diagId) diagId.textContent = id;
    if (diagName) diagName.textContent = KIOSK_LOCATIONS[id] || "Unknown Location";
    
    console.log(`[Dev Tool] Switched Map to: ${id}`);
}

window.devCycleKiosk = function(direction) {
    devKioskIndex += direction;
    if (devKioskIndex >= kioskKeys.length) devKioskIndex = 0;
    if (devKioskIndex < 0) devKioskIndex = kioskKeys.length - 1;
    applyKioskId(kioskKeys[devKioskIndex]);
};

window.devRandomKiosk = function() {
    devKioskIndex = Math.floor(Math.random() * kioskKeys.length);
    applyKioskId(kioskKeys[devKioskIndex]);
};

window.devResetKiosk = function() {
    if (window.KioskSettings && window.KioskSettings.kiosk_id) {
        const originalId = window.KioskSettings.kiosk_id;
        applyKioskId(originalId);
        
        const realIndex = kioskKeys.indexOf(originalId);
        if (realIndex !== -1) {
            devKioskIndex = realIndex;
        }
        console.log(`[Dev Tool] Reset to physical config ID: ${originalId}`);
    } else {
        console.warn("[Dev Tool] No original config found to reset to.");
    }
};

// ==========================================
// 7. HIDDEN SHORTCUTS (GOD MODE)
// ==========================================
window.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        const diagMenu = document.getElementById('diagnostic-menu');
        const devMenu = document.getElementById('dev-controls');
        
        if (diagMenu) diagMenu.style.display = (diagMenu.style.display === 'none' || diagMenu.style.display === '') ? 'block' : 'none';
        if (devMenu) devMenu.style.display = (devMenu.style.display === 'none' || devMenu.style.display === '') ? 'flex' : 'none';
        
        console.log("[System] Diagnostic Overlay Toggled");
    }
});