/**
 * CAPITAL ONE HUBWALL KIOSK - UNIFIED PHYSICS & DIAGNOSTICS
 */

// 1. Global State
let currentIndex = 0;
let idleTimer;
const viewWidth = 2600; 
let isDragging = false;
let startX = 0;
let startTime = 0;

// 2. Kiosk Location Database (Synced from CSV)
const KIOSK_LOCATIONS = {
    '59LEX': '59th & Lexington',
    'BACKBAY': 'Back Bay',
    'CC-PLAZA': 'Country Club Plaza',
    'COLCIR': 'Columbus Circle',
    'EASTVIEW': 'Eastview Mall',
    'FASHOW': 'Fashion Show',
    'FLORIDA-MALL': 'Florida Mall',
    'GEORGETOWN': 'Georgetown',
    'GULFGATE': 'Gulfgate Center Mall',
    'HARVARD-SQ': 'Harvard Square',
    'HERALD-SQ': 'Herald Square',
    'HOU-GALLERIA': 'Houston Galleria',
    'IRVINE-SP': 'Irvine Spectrum',
    'KOP': 'King of Prussia',
    'LA-CANTERA': 'La Cantera',
    'MIAMI-BEACH': 'Miami Beach',
    'MOA': 'Mall of America',
    'ROSS-PARK': 'Ross Park Mall',
    'SOHO': 'Soho',
    'SOUTHCENTER': 'Southcenter Mall',
    'ST-SOUTHPOINT': 'Streets at Southpoint',
    'STONEBRIAR': 'Stonebriar Centre',
    'UNION-SQ': 'Union Square (NYC)',
    'UNION-STATION': 'Union Station LoDo',
    'UPTOWN-DAL': 'Uptown Dallas (West Village)',
    'VALLEY-FAIR': 'Valley Fair',
    'VICTORIA-GARDENS': 'Victoria Gardens',
    'WEST-COUNTY': 'West County',
    'WOODLANDS': 'Woodlands Mall',
    'WYNNEWOOD': 'Wynnewood Village',
    'DT-AUSTIN': 'Downtown Austin',
    'SCOTTSDALE': 'Scottsdale',
    'STATE-STREET': 'State Street'
};

window.addEventListener('DOMContentLoaded', () => {
    setScale();
    loadKioskConfig();

    const ribbon = document.getElementById('ribbon');
    const startBtn = document.getElementById('start-button');

    if (startBtn) {
        startBtn.addEventListener('click', () => goToScreen(1));
    }

    // --- PHYSICS ENGINE ---
    ribbon.addEventListener('touchstart', (e) => {
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
        if (e.cancelable) e.preventDefault();

        const endX = e.changedTouches[0].clientX;
        const movedBy = endX - startX;
        const duration = new Date().getTime() - startTime;
        const velocity = Math.abs(movedBy) / duration;

        requestAnimationFrame(() => {
            ribbon.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
            if (Math.abs(movedBy) > (viewWidth * 0.2) || velocity > 0.8) {
                if (movedBy > 50 && currentIndex > 1) goToScreen(currentIndex - 1);
                else if (movedBy < -50 && currentIndex < 6) goToScreen(currentIndex + 1);
                else goToScreen(currentIndex);
            } else {
                goToScreen(currentIndex);
            }
        });
    });

    window.addEventListener('touchstart', resetIdleTimer);
    window.addEventListener('mousedown', resetIdleTimer);
    window.addEventListener('resize', setScale);
});

// 3. Navigation Engine
function goToScreen(index) {
    const ribbon = document.getElementById('ribbon');
    const navContainer = document.getElementById('nav-container');
    const dots = document.querySelectorAll('.dot');
    
    currentIndex = index;
    ribbon.style.transition = 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)';
    ribbon.style.transform = `translateX(${currentIndex * -viewWidth}px)`;

    if (navContainer) navContainer.style.display = (currentIndex === 0) ? 'none' : 'flex';

    dots.forEach((dot, i) => {
        (i + 1 === currentIndex) ? dot.classList.add('active') : dot.classList.remove('active');
    });
    
    const leftArrow = document.querySelector('.left-arrow');
    const rightArrow = document.querySelector('.right-arrow');
    if (leftArrow) leftArrow.classList.toggle('hidden', currentIndex === 1);
    if (rightArrow) rightArrow.classList.toggle('hidden', currentIndex === 6);

    resetIdleTimer();
}

// 4. Asset & Config Logic
async function loadKioskConfig() {
    try {
        const response = await fetch('./config.json');
        const config = await response.json();
        const id = config.kiosk_id;
        
        // Update Map
        const mapImg = document.getElementById('dynamic-map');
        if (mapImg) mapImg.src = `src/assets/images/maps/H_MAP_${id}.png`;
        
        // Update Diagnostic Display
        document.getElementById('diag-id').textContent = id;
        document.getElementById('diag-name').textContent = KIOSK_LOCATIONS[id] || "Unknown Location";

        window.KioskSettings = config; 
        console.log(`System: Loaded Kiosk ${id} - ${KIOSK_LOCATIONS[id]}`);
    } catch (err) { 
        console.error("Config failed.", err); 
    }
}

function setScale() {
    const wrapper = document.getElementById('scale-wrapper');
    if (!wrapper) return;
    const scale = Math.min(window.innerWidth / 3840, window.innerHeight / 2160);
    wrapper.style.transform = `scale(${scale})`;
}

function resetIdleTimer() {
    clearTimeout(idleTimer);
    if (currentIndex !== 0) idleTimer = setTimeout(() => goToScreen(0), 120000); 
}

function navNext() { if (currentIndex < 6) goToScreen(currentIndex + 1); }
function navPrev() { if (currentIndex > 1) goToScreen(currentIndex - 1); }

window.addEventListener('contextmenu', (e) => e.preventDefault(), false);