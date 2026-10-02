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

const WALK_SPEED_MPS = 1.8; 
const EARTH_RADIUS_M = 6378137;

function offsetMeters(origin, bearingDeg, meters) {
    const b = bearingDeg * Math.PI / 180;
    const dNorth = meters * Math.cos(b);
    const dEast  = meters * Math.sin(b);
    const dLat = (dNorth / EARTH_RADIUS_M) * 180 / Math.PI;
    const dLng = (dEast / (EARTH_RADIUS_M * Math.cos(origin[1] * Math.PI / 180))) * 180 / Math.PI;
    return [origin[0] + dLng, origin[1] + dLat];
}

// Positioned precisely on Tuzcular Street
const START_U = offsetMeters(MAP_CENTER, 148 + SCENE_ROTATION_DEG, 16.5);
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
        
        agentEl.setAttribute("role", "img");
        agentEl.setAttribute("aria-label", "Posizione dell'utente");
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
let currentDirectionBtn = null;

function injectInteractiveUI() {
    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --brand-green: rgba(220, 242, 224, 0.95); 
        }

        /* Marker must never animate its own position: map updates it every frame */
        .marker-cluster, .agent-node {
            transition: none !important;
        }

        /* Google Maps Style Blue Pulse Dot Animation & Layout */
        .google-maps-dot-container {
            position: relative;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .google-maps-pulse {
            position: absolute;
            width: 32px;
            height: 32px;
            background: rgba(66, 133, 244, 0.4);
            border-radius: 50%;
            animation: google-pulse 2s infinite ease-out;
            will-change: transform, opacity;
        }

        .google-maps-core {
            position: relative;
            width: 14px;
            height: 14px;
            background: #4285F4;
            border: 2px solid #ffffff;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }

        @keyframes google-pulse {
            0% {
                transform: scale(0.6);
                opacity: 1;
            }
            100% {
                transform: scale(2.2);
                opacity: 0;
            }
        }

        /* Modern White App Header with Soft Shaded Constraints */
        #modern-app-header {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 64px;
            background: #ffffff;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
        }
        .header-logo {
            display: flex;
            align-items: center;
            gap: 10px;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif;
            font-size: 19px;
            font-weight: 700;
            letter-spacing: -0.4px;
            color: #1a1a1a;
        }
        .logo-icon-wrapper {
            width: 34px;
            height: 34px;
            background: #f0f4f8;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 0 1px 2px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04);
        }
        .logo-icon-wrapper svg {
            color: #2b6cb0;
        }

        /* Minimal Omnidirectional Touchpad Controller Container */
        #d-pad {
            position: absolute;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            width: 104px;
            height: 104px;
            background: var(--brand-green);
            border-radius: 50%;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.06);
            border: 2px solid rgba(255, 255, 255, 0.9);
            z-index: 2000;
            cursor: pointer;
            touch-action: manipulation;
            -webkit-tap-highlight-color: transparent;
            transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        #d-pad:active, #d-pad.active {
            transform: translateX(-50%) scale(0.95);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            background: #c8e6cb;
        }

        /* Minimal Directional Indicators (Arrows & Diagonal Dots) */
        .pad-indicator {
            position: absolute;
            color: rgba(45, 55, 72, 0.65);
            pointer-events: none;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: color 0.15s ease;
        }
        #d-pad:active .pad-indicator, #d-pad.active .pad-indicator {
            color: rgba(26, 32, 44, 0.9);
        }
        .ind-n  { top: 5px; left: 50%; transform: translateX(-50%); font-size: 12px; }
        .ind-ne { top: 16px; right: 16px; font-size: 8px; }
        .ind-e  { right: 6px; top: 50%; transform: translateY(-50%); font-size: 12px; }
        .ind-se { bottom: 16px; right: 16px; font-size: 8px; }
        .ind-s  { bottom: 5px; left: 50%; transform: translateX(-50%); font-size: 12px; }
        .ind-sw { bottom: 16px; left: 16px; font-size: 8px; }
        .ind-w  { left: 6px; top: 50%; transform: translateY(-50%); font-size: 12px; }
        .ind-nw { top: 16px; left: 16px; font-size: 8px; }
    `;
    document.head.appendChild(style);

    // Inject Modern White App Header with Circular Logo Icon
    const modernHeader = document.createElement('div');
    modernHeader.id = 'modern-app-header';
    modernHeader.innerHTML = `
        <div class="header-logo">
            <div class="logo-icon-wrapper">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
            </div>
            DoveSeiApp
        </div>
    `;
    document.body.appendChild(modernHeader);

    // Inject Omnidirectional Touchpad Controller with Minimal Direction Indicators
    const dpad = document.createElement('div');
    dpad.id = 'd-pad';
    dpad.setAttribute('aria-label', "Area di controllo del movimento");
    dpad.innerHTML = `
        <span class="pad-indicator ind-n">&#9650;</span>
        <span class="pad-indicator ind-ne">&bull;</span>
        <span class="pad-indicator ind-e">&#9654;</span>
        <span class="pad-indicator ind-se">&bull;</span>
        <span class="pad-indicator ind-s">&#9660;</span>
        <span class="pad-indicator ind-sw">&bull;</span>
        <span class="pad-indicator ind-w">&#9664;</span>
        <span class="pad-indicator ind-nw">&bull;</span>
    `;
    document.body.appendChild(dpad);

    setupMovementControls();
}

function setupMovementControls() {
    const keyDirections = {
        'ArrowUp': (0 + SCENE_ROTATION_DEG) % 360,
        'ArrowRight': (90 + SCENE_ROTATION_DEG) % 360,
        'ArrowDown': (180 + SCENE_ROTATION_DEG) % 360,
        'ArrowLeft': (270 + SCENE_ROTATION_DEG) % 360
    };

    let activeBearing = null;
    let rafId = null;
    let lastTs = null;

    // Marker and camera are updated together, once per screen frame
    const frame = (ts) => {
        if (activeBearing === null) {
            rafId = null;
            lastTs = null;
            return;
        }
        if (lastTs === null) lastTs = ts;
        // Clamp dt so a lag spike or background tab never causes a jump
        const dt = Math.min((ts - lastTs) / 1000, 0.05);
        lastTs = ts;

        userPos = offsetMeters(userPos, activeBearing, WALK_SPEED_MPS * dt);
        positions["mainNode"] = userPos;

        if (markerInstances["mainNode"]) markerInstances["mainNode"].setLngLat(userPos);
        
        // HARİTAYI SABİTLEMEK İÇİN BU SATIR DEVRE DIŞI BIRAKILDI
        // if (map) map.jumpTo({ center: userPos });

        rafId = requestAnimationFrame(frame);
    };

    const startMove = (bearing, identifier) => {
        currentDirectionBtn = identifier;
        activeBearing = bearing;

        const touchpad = document.getElementById('d-pad');
        if (touchpad) touchpad.classList.add('active');

        if (rafId === null) {
            lastTs = null;
            rafId = requestAnimationFrame(frame);
        }
    };

    const stopMove = (identifier) => {
        if (currentDirectionBtn !== identifier && identifier !== 'ALL') return;

        activeBearing = null;
        currentDirectionBtn = null;

        const touchpad = document.getElementById('d-pad');
        if (touchpad) touchpad.classList.remove('active');
    };

    const handleTouchpadInteraction = (clientX, clientY, identifier) => {
        const touchpad = document.getElementById('d-pad');
        if (!touchpad) return;
        const rect = touchpad.getBoundingClientRect();
        const dx = clientX - (rect.left + rect.width / 2);
        const dy = clientY - (rect.top + rect.height / 2);

        let angleDeg = Math.atan2(dx, -dy) * (180 / Math.PI);
        if (angleDeg < 0) angleDeg += 360;

        startMove((angleDeg + SCENE_ROTATION_DEG) % 360, identifier);
    };

    const touchpad = document.getElementById('d-pad');
    if (touchpad) {
        touchpad.addEventListener('mousedown', (e) => {
            e.preventDefault();
            handleTouchpadInteraction(e.clientX, e.clientY, 'mouse');
        });

        touchpad.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            handleTouchpadInteraction(touch.clientX, touch.clientY, 'touch');
        }, { passive: false });

        window.addEventListener('mouseup', () => stopMove('mouse'));
        touchpad.addEventListener('mouseleave', () => stopMove('mouse'));
        window.addEventListener('touchend', (e) => {
            if (e.touches.length === 0) stopMove('touch');
        });
    }

    window.addEventListener('keydown', (e) => {
        if (keyDirections[e.key] !== undefined && currentDirectionBtn !== e.key) {
            startMove(keyDirections[e.key], e.key);
        }
    });
    window.addEventListener('keyup', (e) => {
        if (keyDirections[e.key] !== undefined) stopMove(e.key);
    });
}

/* ==========================================================================
 * QUALTRICS HANDSHAKE & TIMEOUTS
 * ========================================================================== */
const SESSION_ID = "sess_" + Date.now() + "_" + Math.random().toString(36).slice(2, 9);
let qualtricsAckReceived = false;
let hasSentCompletion = false;
let handshakeIntervalId = null;

const EXPERIMENT_DURATION_MS = 20000; 

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

    let flowDismissed = false;
    function dismissFlow() {
        if (flowDismissed) return;
        flowDismissed = true;

        if (stepConnecting) stepConnecting.classList.add("hidden");
        if (flowScreen) {
            flowScreen.style.opacity = "0";
            flowScreen.style.transform = "scale(0.95)";
            setTimeout(() => {
                flowScreen.style.display = "none";
            }, 500);
        }
        initMarkers();
        startInteractivePhase();
    }

    setTimeout(dismissFlow, 3000);

    function startInteractivePhase() {
        animationStarted = true;
        injectInteractiveUI();
        
        setTimeout(() => {
            sendCompletionSignal("normal");
        }, EXPERIMENT_DURATION_MS);
    }

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
                center: START_U,
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