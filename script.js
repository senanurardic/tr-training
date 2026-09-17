/* ============================================================================
 * LOCATION-SHARING SOCIAL DISCONNECTION PARADIGM
 * Condition: Participant Training Phase
 * ========================================================================== */

const CONDITION = "INTERACTIVE";
const CONDITION_LABEL = "Interactive Single Node";

/* ==========================================================================
 * SHARED GEOMETRY AND TIMING
 * ========================================================================== */
const MAP_CENTER = [32.870379, 39.921936]; 
const MAP_ZOOM = 18.0;

// Rotation angle for map and movement vectors (to align with roads)
const SCENE_ROTATION_DEG = 55;

const WALK_SPEED_MPS = 1.5; 
const EARTH_RADIUS_M = 6378137;

function offsetMeters(origin, bearingDeg, meters) {
    const b = bearingDeg * Math.PI / 180;
    const dNorth = meters * Math.cos(b);
    const dEast  = meters * Math.sin(b);
    const dLat = (dNorth / EARTH_RADIUS_M) * 180 / Math.PI;
    const dLng = (dEast / (EARTH_RADIUS_M * Math.cos(origin[1] * Math.PI / 180))) * 180 / Math.PI;
    return [origin[0] + dLng, origin[1] + dLat];
}

const START_U = offsetMeters(MAP_CENTER, 162 + SCENE_ROTATION_DEG, 48.0);
let userPos = [...START_U];

const positions = { mainNode: START_U };
const people = [ { id: "mainNode", markerType: "blue-pulse-dot" } ];

/* ==========================================================================
 * BROWSER RUNTIME & MARKERS
 * ========================================================================== */
let animationStarted = false;
let map = null;
const markerInstances = {};

function createMarkerElement(person) {
    const clusterEl = document.createElement("div");
    clusterEl.className = "marker-cluster";
    const agentEl = document.createElement("div");
    agentEl.className = "agent-node";

    if (person.markerType === "blue-pulse-dot") {
        const mapsDotContainer = document.createElement("div");
        mapsDotContainer.className = "google-maps-dot-container";
        const breathingPulse = document.createElement("div");
        breathingPulse.className = "google-maps-pulse";
        const solidCore = document.createElement("div");
        solidCore.className = "google-maps-core";
        mapsDotContainer.appendChild(breathingPulse);
        mapsDotContainer.appendChild(solidCore);
        agentEl.appendChild(mapsDotContainer);
        
        // Label removed for Participant Training Phase
        
        agentEl.setAttribute("role", "img");
        agentEl.setAttribute("aria-label", "Kullanıcı konumu");
    }
    clusterEl.appendChild(agentEl);
    return clusterEl;
}

function initMarkers() {
    if (!map) return;
    people.forEach(person => {
        const marker = new maplibregl.Marker({ element: createMarkerElement(person), anchor: "center" })
            .setLngLat(positions[person.id])
            .addTo(map);
        markerInstances[person.id] = marker;
    });
}

/* ==========================================================================
 * INTERACTIVE MOVEMENT LOGIC & UI INJECTION
 * ========================================================================== */
let moveInterval = null;
let currentDirectionBtn = null;

function injectInteractiveUI() {
    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            /* Brand green color from the starting screen */
            --brand-green: rgba(220, 242, 224, 0.95); 
        }

        /* Modern App Header Styles */
        #modern-app-header {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 60px;
            background: var(--brand-green);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.08);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
        }
        .header-logo {
            display: flex;
            align-items: center;
            gap: 8px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: -0.5px;
            color: #1a1a1a;
        }
        .header-logo svg {
            color: #2b6cb0;
        }

        /* Instruction Overlay */
        #nav-instruction {
            position: absolute;
            top: 80px; 
            left: 50%;
            transform: translateX(-50%);
            background: rgba(255, 255, 255, 0.95);
            padding: 12px 20px;
            border-radius: 20px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.12);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            font-size: 14px;
            font-weight: 500;
            color: #333333;
            text-align: center;
            z-index: 1000;
            pointer-events: none;
            backdrop-filter: blur(4px);
            white-space: nowrap;
        }

        /* D-Pad Controls Container (Floating Frame) */
        #d-pad {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            
            /* Styled as a floating panel to frame the buttons */
            background: var(--brand-green);
            padding: 20px;
            border-radius: 28px;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.4);
            
            display: grid;
            grid-template-columns: 60px 60px 60px;
            grid-template-rows: 60px 60px;
            gap: 8px;
            z-index: 2000;
        }
        .d-btn {
            background: #ffffff;
            border: 1px solid rgba(0,0,0,0.05);
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            font-size: 24px;
            color: #475569;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            user-select: none;
            touch-action: manipulation;
            transition: all 0.1s ease;
            -webkit-tap-highlight-color: transparent;
        }
        .d-btn:active, .d-btn.active {
            background: #f1f5f9;
            transform: scale(0.92);
            color: #0f172a;
            box-shadow: 0 2px 6px rgba(0,0,0,0.1);
        }
        #btn-up { grid-column: 2; grid-row: 1; }
        #btn-left { grid-column: 1; grid-row: 2; }
        #btn-down { grid-column: 2; grid-row: 2; }
        #btn-right { grid-column: 3; grid-row: 2; }
    `;
    document.head.appendChild(style);

    // Inject Modern App Header
    const modernHeader = document.createElement('div');
    modernHeader.id = 'modern-app-header';
    modernHeader.innerHTML = `
        <div class="header-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
            </svg>
            NeredeApp
        </div>
    `;
    document.body.appendChild(modernHeader);

    // Inject Navigation Instructions
    const instruction = document.createElement('div');
    instruction.id = 'nav-instruction';
    instruction.textContent = 'Haritada istediğiniz şekilde hareket edebilmek için ok işaretlerini kullanın.';
    document.body.appendChild(instruction);

    // Inject Directional Pad (Now acts as the green frame itself)
    const dpad = document.createElement('div');
    dpad.id = 'd-pad';
    dpad.innerHTML = `
        <button id="btn-up" class="d-btn" aria-label="Yukarı">&#9650;</button>
        <button id="btn-left" class="d-btn" aria-label="Sol">&#9664;</button>
        <button id="btn-down" class="d-btn" aria-label="Aşağı">&#9660;</button>
        <button id="btn-right" class="d-btn" aria-label="Sağ">&#9654;</button>
    `;
    document.body.appendChild(dpad);

    setupMovementControls();
}

function setupMovementControls() {
    const TICK_RATE_MS = 50; 
    const METERS_PER_TICK = (WALK_SPEED_MPS / 1000) * TICK_RATE_MS;

    const directions = {
        'btn-up': (0 + SCENE_ROTATION_DEG) % 360, 
        'btn-right': (90 + SCENE_ROTATION_DEG) % 360, 
        'btn-down': (180 + SCENE_ROTATION_DEG) % 360, 
        'btn-left': (270 + SCENE_ROTATION_DEG) % 360,
        'ArrowUp': (0 + SCENE_ROTATION_DEG) % 360, 
        'ArrowRight': (90 + SCENE_ROTATION_DEG) % 360, 
        'ArrowDown': (180 + SCENE_ROTATION_DEG) % 360, 
        'ArrowLeft': (270 + SCENE_ROTATION_DEG) % 360
    };

    const moveStep = (bearing) => {
        userPos = offsetMeters(userPos, bearing, METERS_PER_TICK);
        if (markerInstances["mainNode"]) {
            markerInstances["mainNode"].setLngLat(userPos);
        }
        if (map) {
            map.panTo(userPos, { duration: TICK_RATE_MS, animate: true, easing: (t) => t });
        }
    };

    const startMove = (bearing, btnId) => {
        if (moveInterval) clearInterval(moveInterval);
        currentDirectionBtn = btnId;
        
        const uiBtn = document.getElementById(btnId.replace('Arrow', 'btn-').toLowerCase());
        if (uiBtn) uiBtn.classList.add('active');

        moveStep(bearing);
        moveInterval = setInterval(() => moveStep(bearing), TICK_RATE_MS);
    };

    const stopMove = (btnId) => {
        if (currentDirectionBtn !== btnId && btnId !== 'ALL') return;
        
        if (moveInterval) {
            clearInterval(moveInterval);
            moveInterval = null;
            currentDirectionBtn = null;
        }
        document.querySelectorAll('.d-btn').forEach(b => b.classList.remove('active'));
    };

    ['btn-up', 'btn-right', 'btn-down', 'btn-left'].forEach(id => {
        const btn = document.getElementById(id);
        const bearing = directions[id];
        
        btn.addEventListener('mousedown', (e) => { e.preventDefault(); startMove(bearing, id); });
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); startMove(bearing, id); }, { passive: false });
        
        btn.addEventListener('mouseup', () => stopMove(id));
        btn.addEventListener('mouseleave', () => stopMove('ALL'));
        btn.addEventListener('touchend', (e) => { e.preventDefault(); stopMove(id); });
    });

    window.addEventListener('keydown', (e) => {
        if (directions[e.key] !== undefined && currentDirectionBtn !== e.key) {
            startMove(directions[e.key], e.key);
        }
    });
    window.addEventListener('keyup', (e) => {
        if (directions[e.key] !== undefined) {
            stopMove(e.key);
        }
    });
}

/* ==========================================================================
 * QUALTRICS HANDSHAKE & TIMEOUTS
 * ========================================================================== */
const SESSION_ID = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
let qualtricsAckReceived = false;
let hasSentCompletion = false;
let handshakeIntervalId = null;

const EXPERIMENT_DURATION_MS = 60000; 

function buildPayload(reason) {
    return {
        type: "MAP_ANIMATION_COMPLETE",
        condition: CONDITION,
        conditionLabel: CONDITION_LABEL,
        sessionId: SESSION_ID,
        status: (reason === "normal") ? "complete" : "incomplete",
        reason: reason,
        timestamp: Date.now()
    };
}

function sendCompletionSignal(reason) {
    if (hasSentCompletion) return;
    hasSentCompletion = true;
    const payload = buildPayload(reason);

    let attempts = 0;
    handshakeIntervalId = setInterval(() => {
        attempts++;
        try { if (window.parent) window.parent.postMessage(payload, "*"); } catch (e) {}
        if (qualtricsAckReceived || attempts >= 15) {
            clearInterval(handshakeIntervalId);
        }
    }, 400);
}

/* ==========================================================================
 * ONBOARDING FLOW
 * ========================================================================== */
function bootstrap() {
    window.addEventListener("message", (event) => {
        if (event.data && event.data.type === "MAP_ANIMATION_ACK" && event.data.sessionId === SESSION_ID) {
            qualtricsAckReceived = true;
        }
    });

    const flowScreen = document.getElementById("experiment-flow-screen");
    const stepConnecting = document.getElementById("step-connecting");

    function startExperimentFlow() {
        setTimeout(() => {
            if (stepConnecting) stepConnecting.classList.add("hidden");
            
            if (flowScreen) {
                flowScreen.style.opacity = "0";
                flowScreen.style.transform = "scale(0.95)";
            }
            
            setTimeout(() => {
                if (flowScreen) flowScreen.style.display = "none";
                initMarkers();
                startInteractivePhase();
            }, 500);
        }, 3000);
    }

    function startInteractivePhase() {
        animationStarted = true;
        injectInteractiveUI();
        
        setTimeout(() => {
            sendCompletionSignal("normal");
        }, EXPERIMENT_DURATION_MS);
    }

    startExperimentFlow();

    /* ------------------------------------------------------------------
     * BASEMAP LOGIC
     * ------------------------------------------------------------------ */
    function declutterBasemap() {
        const HIDDEN_SOURCE_LAYERS = ["poi", "housenumber", "mountain_peak", "aerodrome_label", "aeroway"];
        const KEEP_VISIBLE = /park|garden|playground|pitch|forest|wood|water_name|nature|recreation/;
        try {
            const layers = (map.getStyle() && map.getStyle().layers) || [];
            layers.forEach(layer => {
                const id = String(layer.id || "").toLowerCase();
                const srcLayer = String(layer["source-layer"] || "").toLowerCase();
                const isExtrusion = layer.type === "fill-extrusion";
                if (KEEP_VISIBLE.test(id) || srcLayer === "park") { if (!isExtrusion) return; }
                if (isExtrusion || HIDDEN_SOURCE_LAYERS.indexOf(srcLayer) !== -1) {
                    try { map.setLayoutProperty(layer.id, "visibility", "none"); } catch (e) {}
                }
            });
        } catch (e) {}
    }

    function applyFindMyPalette() {
        const PALETTE = {
            land: "#f2efe6", green: "#bfe3ab", greenSoft: "#d6ead0", greenDeep: "#a8d493",
            water: "#a9d8f0", road: "#ffffff", roadCase: "#e4dfd3", building: "#e8e3d8",
            text: "#5a6b5e", textHalo: "#ffffff"
        };
        function paint(id, prop, value) { try { map.setPaintProperty(id, prop, value); } catch (e) {} }
        try {
            const layers = (map.getStyle() && map.getStyle().layers) || [];
            layers.forEach(layer => {
                const id = String(layer.id || "").toLowerCase();
                const sl = String(layer["source-layer"] || "").toLowerCase();
                const t = layer.type;
                const isGreen = sl === "park" || /park|grass|wood|forest|garden|pitch|golf|cemetery|scrub|meadow|orchard/.test(id);
                const isWater = sl === "water" || sl === "waterway" || /water|ocean|river|lake|sea|bay/.test(id);

                if (t === "background") { paint(id, "background-color", PALETTE.land); return; }
                if (isWater) { if (t === "fill") paint(id, "fill-color", PALETTE.water); if (t === "line") paint(id, "line-color", PALETTE.water); return; }
                if (isGreen) { if (t === "fill") { paint(id, "fill-color", PALETTE.green); paint(id, "fill-opacity", 1); } if (t === "line") paint(id, "line-color", PALETTE.greenDeep); return; }
                if (sl === "landcover") { if (t === "fill") { paint(id, "fill-color", PALETTE.greenSoft); paint(id, "fill-opacity", 0.9); } return; }
                if (sl === "landuse") { if (t === "fill") paint(id, "fill-color", PALETTE.land); return; }
                if (sl === "building") { if (t === "fill") { paint(id, "fill-color", PALETTE.building); paint(id, "fill-opacity", 0.85); } return; }
                if (sl === "transportation") { if (t === "line") paint(id, "line-color", /casing|outline|bridge|tunnel/.test(id) ? PALETTE.roadCase : PALETTE.road); return; }
                if (t === "symbol") { paint(id, "text-color", PALETTE.text); paint(id, "text-halo-color", PALETTE.textHalo); paint(id, "text-halo-width", 1.4); }
            });
        } catch (e) {}
    }

    try {
        if (typeof maplibregl !== "undefined") {
            map = new maplibregl.Map({
                container: "map",
                style: "https://tiles.openfreemap.org/styles/liberty",
                center: MAP_CENTER,
                zoom: MAP_ZOOM,
                bearing: SCENE_ROTATION_DEG, 
                minZoom: MAP_ZOOM,
                maxZoom: MAP_ZOOM,
                dragPan: false, doubleClickZoom: false, boxZoom: false,
                keyboard: false, touchZoomRotate: false,
                pixelRatio: window.devicePixelRatio || 2
            });

            map.on("load", () => {
                declutterBasemap();
                applyFindMyPalette();
                map.getCanvas().style.filter = "none";
            });
        }
    } catch (error) {
        console.error("Map initialization failed:", error);
    }
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    bootstrap();
}