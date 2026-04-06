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

// 3. The Safe Pixel Reader
function getPixelColor(x, y) {
    try {
        let color;
        if (window.a1lib && typeof a1lib.getPixel === "function") {
            color = a1lib.getPixel(x, y);
            return { r: color[0], g: color[1], b: color[2] };
        } else {
            let colorInt = alt1.getPixel(x, y);
            return { r: (colorInt >> 16) & 255, g: (colorInt >> 8) & 255, b: colorInt & 255 };
        }
    } catch(e) { return null; }
}

// 4. Boot
window.onload = function() {
    if (window.alt1) {
        document.getElementById("install-screen").style.display = "none";
        document.getElementById("app-controls").style.display = "block";
        document.getElementById("status").innerText = savedAnchor ? "Ready! Open Bank." : "Please Calibrate.";
        startScanning();
    } else {
        document.getElementById("install-screen").style.display = "block";
    }
};

// 5. Calibrate
function startCalibration() {
    if (isCalibrating) return;
    isCalibrating = true;
    let count = 3;
    let countdown = setInterval(() => {
        document.getElementById("status").innerText = `Hover over Cog... (${count}s)`;
        if (count-- <= 0) {
            clearInterval(countdown);
            let pos = (window.a1lib) ? a1lib.mousePosition() : alt1.mousePosition;
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
        if (isCalibrating || !savedAnchor) return;
        let p = getPixelColor(savedAnchor.x, savedAnchor.y);
        if (p && p.r > 100 && p.g > 70) {
            document.getElementById("status").innerText = "Bank Active";
            let pageP = getPixelColor(savedAnchor.x - 85, savedAnchor.y + 5);
            let offset = (pageP && pageP.r > 160) ? 10 : 1;
            alt1.overloadOut();
            for (let i = 0; i < 9; i++) {
                let idx = offset + i;
                if (presets[idx]) {
                    let x = savedAnchor.x - 238 + ((i % 5) * 40);
                    let y = savedAnchor.y - 41 + (Math.floor(i / 5) * 40);
                    alt1.overloadImg(presets[idx], x, y, 30, 30);
                }
            }
        } else {
            document.getElementById("status").innerText = "Bank Closed.";
            alt1.overloadOut();
        }
    }, 400);
}
