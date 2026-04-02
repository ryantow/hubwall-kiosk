// 1. Global State
let currentSession = {
  session_id: null,
  start_time: null,
  meta: {
    map_time_sec: 0,
    poi_popups: 0,
    easter_eggs: 0,
    back_to_map_clicks: 0,
    screenindex: 0,
    poi_clicks: {}
  }
};

// 2. Start the Session
async function startSession() {
  const config = window.KioskSettings; // Grab the config that main.js loaded

  if (!config || !config.API_URL) {
    console.warn("Config not loaded. Wait for main.js to finish loading config.json.");
    return;
  }

  currentSession.start_time = Date.now();
  const kioskId = config.KIOSK_ID || config.kiosk_id; 
  
  // NEW: Generate the ID on the device instantly
  currentSession.session_id = crypto.randomUUID().replace(/-/g, '').toUpperCase();
  
  try {
    const response = await fetch(`${config.API_URL}/session/start`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.API_KEY}`
      },
      // NEW: Pass the locally generated session_id in the payload
      body: JSON.stringify({ 
        kiosk_id: kioskId, 
        session_id: currentSession.session_id, 
        app_version: "1.0" 
      })
    });
    
    // We don't technically need to read the response data anymore since we made the ID,
    // but it's good to ensure it succeeded.
    if (!response.ok) throw new Error("Server rejected start session");
    console.log("Session started (Local ID):", currentSession.session_id);
    
  } catch (error) {
    console.error("Failed to start session:", error);
  }
}

// 3. Track User Actions
function trackPOIClick(poiName) {
  currentSession.meta.poi_popups += 1;
  
  if (!currentSession.meta.poi_clicks[poiName]) {
    currentSession.meta.poi_clicks[poiName] = 1;
  } else {
    currentSession.meta.poi_clicks[poiName] += 1;
  }
}

function updateScreenDepth(index) {
  currentSession.meta.screenindex = index;
}

// Measures restart clicks
async function logRestartClick() {
  const config = window.KioskSettings;
  if (!currentSession.session_id || !config || !config.API_URL) return;

  try {
    await fetch(`${config.API_URL}/session/restart_click`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.API_KEY}`
      },
      body: JSON.stringify({ session_id: currentSession.session_id })
    });
    console.log("Restart click logged successfully.");
  } catch (error) {
    console.error("Failed to log restart:", error);
  }
}

// 4. End or Abandon Session (Fixed to prevent 500 crashes)
async function endSession(isAbandoned = false) {
  const config = window.KioskSettings;

  if (!currentSession.session_id || !config || !config.API_URL) return;
  
  const totalClientMs = Date.now() - currentSession.start_time;
  const kioskId = config.KIOSK_ID || config.kiosk_id; 
  
  // Package up the session data
  const payload = {
    session_id: currentSession.session_id,
    kiosk_id: kioskId, // <--- NEW: Required by the new Python Upsert route
    client_ms: totalClientMs,
    meta: currentSession.meta
  };
  
  try {
    // If they timed out, only hit abandon. If they clicked restart, only hit complete.
    const endpoint = isAbandoned ? '/session/abandon' : '/session/complete';

    await fetch(`${config.API_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Session ${isAbandoned ? 'abandoned' : 'completed'} successfully.`);
    
    // Reset session state for the next user
    currentSession.session_id = null;
    currentSession.meta = {
      map_time_sec: 0, poi_popups: 0, easter_eggs: 0, 
      back_to_map_clicks: 0, screenindex: 0, poi_clicks: {}
    };
    
  } catch (error) {
    console.error("Failed to end session:", error);
  }
}