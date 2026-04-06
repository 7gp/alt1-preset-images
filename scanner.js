let presets = JSON.parse(localStorage.getItem("rs_preset_imgs") || "{}");
let savedAnchor = JSON.parse(localStorage.getItem("rs_bank_anchor") || "null");
let showSettings = false;
let isCalibrating = false;

// 1. Build Uploads
const inputContainer = document.getElementById("inputs");
for (let i = 1; i <= 18; i++) {
    let div = document.createElement("div");
    div.className = "upload-row";
    div.innerHTML = `<span>Preset #${i}:</span> <input type="file" accept="image/*" id="file-${i}" style="width: 140px;">`;
    inputContainer.appendChild(div);
    
    document.getElementById(`file-${i}`).addEventListener("change", function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            presets[i] = event.target.result;
            localStorage.setItem("rs_preset_imgs", JSON.stringify(presets));
        };
        reader.readAsDataURL(file);
    });
}

// 2. Listeners
document.getElementById("settings-btn").addEventListener("click", () => toggleSettings());
document.getElementById("close-settings-btn").addEventListener("click", () => toggleSettings());
document.getElementById("cal-btn").addEventListener("click", () => startCalibration());

function toggleSettings() {
    showSettings = !showSettings;
    document.getElementById("settings-menu").style.display = showSettings ? "block" : "none";
}

// 3. Safe Pixel Reader
function getPixelColor(x, y) {
    try {
        let color = a1lib.getPixel(x, y);
        if (!color) return null;
        return { r: color[0], g: color[1], b: color[2] };
    } catch(e) { return null; }
}

// 4. Boot
window.onload = function() {
    if (window.alt1) {
        document.getElementById("install-screen").style.display = "none";
        document.getElementById("app-controls").style.display = "block";
        document.getElementById("status").innerText = savedAnchor ? "Ready!" : "Please Calibrate.";
        startScanning();
    } else {
        document.getElementById("install-screen").style.display = "block";
    }
};

// 5. Calibrate (Hover exactly on the center of the Gold Cog)
function startCalibration() {
    if (isCalibrating) return;
    isCalibrating = true;
    let count = 3;
    let countdown = setInterval(() => {
        document.getElementById("status").innerText = `Hover Cog... (${count})`;
        if (count-- <= 0) {
            clearInterval(countdown);
            let pos = a1lib.mousePosition();
            if (pos) {
                savedAnchor = { x: pos.x, y: pos.y };
                localStorage.setItem("rs_bank_anchor", JSON.stringify(savedAnchor));
                document.getElementById("status").innerText = "Saved!";
            }
            isCalibrating = false;
        }
    }, 1000);
}

// 6. Engine
function startScanning() {
    setInterval(() => {
        if (isCalibrating || !savedAnchor || !window.alt1) return;
        
        let p = getPixelColor(savedAnchor.x, savedAnchor.y);
        
        // TRANSPARENCY-PROOF LOGIC:
        // Instead of a fixed number, we check if Red is the dominant color.
        // Gold always has significantly more Red/Green than Blue.
        if (p && p.r > p.b + 40 && p.g > p.b + 20) {
            document.getElementById("status").innerText = "Bank Active";
            
            // Check Page (The 'Next' arrow is to the left of the Cog)
            let pageP = getPixelColor(savedAnchor.x - 25, savedAnchor.y);
            let isPageTwo = (pageP && pageP.r > pageP.b + 50); 
            let offset = isPageTwo ? 10 : 1;
            
            try { alt1.overloadOut(""); } catch(e) {}

            for (let i = 0; i < 10; i++) {
                let idx = offset + i;
                if (presets[idx]) {
                    let col = i % 5;
                    let row = Math.floor(i / 5);
                    
                    // Specific math for your 2x5 Preset grid layout
                    let posX = savedAnchor.x - 170 + (col * 34.5);
                    let posY = savedAnchor.y - 65 + (row * 31.5);
                    
                    try {
                        alt1.overloadImg(presets[idx], Math.floor(posX), Math.floor(posY), 24, 24);
                    } catch(e) {}
                }
            }
        } else {
            document.getElementById("status").innerText = "Bank Closed.";
            try { alt1.overloadOut(""); } catch(e) {}
        }
    }, 400);
}
