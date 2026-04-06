let presets = JSON.parse(localStorage.getItem("rs_preset_imgs") || "{}");
let savedAnchor = JSON.parse(localStorage.getItem("rs_bank_anchor") || "null");
let showSettings = false;
let isCalibrating = false;

// 1. Build the Upload Menu
const inputContainer = document.getElementById("inputs");
for (let i = 1; i <= 18; i++) {
    let div = document.createElement("div");
    div.className = "upload-row";
    
    let label = document.createElement("span");
    label.innerText = `Preset #${i}:`;
    
    let input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.style.width = "140px";
    
    input.addEventListener("change", function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (event) => {
            presets[i] = event.target.result;
            localStorage.setItem("rs_preset_imgs", JSON.stringify(presets));
        };
        reader.readAsDataURL(file);
    });

    div.appendChild(label);
    div.appendChild(input);
    inputContainer.appendChild(div);
}

// 2. Button Event Listeners
document.getElementById("settings-btn").addEventListener("click", toggleSettings);
document.getElementById("close-settings-btn").addEventListener("click", toggleSettings);
document.getElementById("cal-btn").addEventListener("click", startCalibration);

function toggleSettings() {
    showSettings = !showSettings;
    document.getElementById("settings-menu").style.display = showSettings ? "block" : "none";
}

// 3. The Boot Sequence
window.onload = function() {
    // Check for a1lib (Legacy) permissions
    if (window.alt1 && alt1.permissionPixel) {
        document.getElementById("install-screen").style.display = "none";
        document.getElementById("app-controls").style.display = "block";
        
        if (savedAnchor) {
            document.getElementById("status").innerText = "Ready! Open your bank.";
        } else {
            document.getElementById("status").innerText = "Click Calibrate to begin.";
        }
        startScanning();
    } else {
        document.getElementById("install-screen").style.display = "block";
        document.getElementById("app-controls").style.display = "none";
    }
};

// 4. Calibration
function startCalibration() {
    if (isCalibrating || !window.alt1) return;
    isCalibrating = true;
    
    let count = 3;
    document.getElementById("status").innerText = `Hover over the Gold Cog! (${count}s...)`;
    
    let countdown = setInterval(() => {
        count--;
        if (count > 0) {
            document.getElementById("status").innerText = `Hover over the Gold Cog! (${count}s...)`;
        } else {
            clearInterval(countdown);
            
            try {
                // Using the Legacy a1lib helper for mouse position
                let pos = a1lib.mousePosition();
                if (pos) {
                    savedAnchor = { x: pos.x, y: pos.y };
                    localStorage.setItem("rs_bank_anchor", JSON.stringify(savedAnchor));
                    document.getElementById("status").innerText = "Calibration Saved!";
                } else {
                    document.getElementById("status").innerText = "Error: Could not read mouse.";
                }
            } catch (error) {
                console.error(error);
                document.getElementById("status").innerText = "Fatal Error: Mouse tracking failed.";
            }
            
            isCalibrating = false;
            setTimeout(() => { 
                if(savedAnchor && document.getElementById("status").innerText === "Calibration Saved!") {
                    document.getElementById("status").innerText = "Scanning for Bank..."; 
                }
            }, 2000);
        }
    }, 1000);
}

// 5. Native Pixel Reader Helper (Corrected for Legacy Lib)
function getPixelColor(x, y) {
    // Use the raw alt1 object for getPixel (standard Alt1 API)
    // Most Alt1 versions expect the raw alt1.getPixel call
    try {
        let colorInt = alt1.getPixel(x, y);
        if (colorInt === -1) return null; 
        return {
            r: (colorInt >> 16) & 255,
            g: (colorInt >> 8) & 255,
            b: colorInt & 255
        };
    } catch(e) {
        // Fallback for some Alt1 versions that wrap it in a1lib
        return a1lib.getPixel(x, y);
    }
}

// 6. The Overlay Engine
function startScanning() {
    setInterval(() => {
        if (isCalibrating || !window.alt1 || !alt1.permissionPixel || !savedAnchor) return;

        let checkPix = getPixelColor(savedAnchor.x, savedAnchor.y);
        
        // If the pixel exists and has enough Red/Green to be Gold/Brown
        if (checkPix && checkPix.r > 120 && checkPix.g > 90) {
            document.getElementById("status").innerText = "Bank Active";

            // Check page 1 vs 10
            let pagePix = getPixelColor(savedAnchor.x - 85, savedAnchor.y + 5);
            let isPageTwo = (pagePix && pagePix.r > 180); 
            let offset = isPageTwo ? 10 : 1;

            alt1.overloadOut(); 

            for (let i = 0; i < 9; i++) {
                let pIdx = offset + i;
                if (presets[pIdx]) {
                    let col = i % 5;
                    let row = Math.floor(i / 5);
                    // Placement Math relative to the calibrated Cog
                    let x = savedAnchor.x - 238 + (col * 40);
                    let y = savedAnchor.y - 41 + (row * 40);
                    
                    alt1.overloadImg(presets[pIdx], x, y, 30, 30);
                }
            }
        } else {
            document.getElementById("status").innerText = "Bank Closed/Moved.";
            alt1.overloadOut();
        }
    }, 400);
}
