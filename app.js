const a1lib = new Alt1lib();
let presets = JSON.parse(localStorage.getItem("rs_preset_imgs") || "{}");
let showSettings = false;

// Generate 18 upload slots
const inputContainer = document.getElementById("inputs");
for (let i = 1; i <= 18; i++) {
    let div = document.createElement("div");
    div.className = "upload-row";
    div.innerHTML = `<span>Preset ${i}:</span> <input type="file" accept="image/*" onchange="saveImg(${i}, this)">`;
    inputContainer.appendChild(div);
}

function toggleSettings() {
    showSettings = !showSettings;
    document.getElementById("settings-menu").style.display = showSettings ? "block" : "none";
}

function saveImg(num, input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        presets[num] = e.target.result;
        localStorage.setItem("rs_preset_imgs", JSON.stringify(presets));
    };
    reader.readAsDataURL(file);
}

// MAIN LOOP
function main() {
    if (!window.alt1 || !alt1.permissionPixel) {
        document.getElementById("status-text").innerText = "Waiting for Alt1 permissions...";
        return;
    }

    let img = a1lib.captureHoldFull();
    
    // 1. Find the Yellow Cog (Anchor)
    // We search for the specific Hex Color of the Cog to "lock on"
    let cog = img.findColor([219, 171, 9]); 

    if (cog.length > 0) {
        document.getElementById("status-text").innerText = "Bank Found - Overlay Active";
        let anchorX = cog[0].x;
        let anchorY = cog[0].y;

        // 2. Check if we are on Page 2 (Look for the "18" in the bottom right button)
        // We look for white pixels in the area where the '1' of '18' would be
        let isPage2 = img.getPixel(anchorX - 85, anchorY + 5).r > 200; 
        let startIdx = isPage2 ? 10 : 1;

        // 3. Draw Overlays
        alt1.overloadOut(); // Clear previous frame
        for (let i = 0; i < 9; i++) {
            let pNum = startIdx + i;
            if (presets[pNum]) {
                // Layout math: 5 buttons top row, 4 buttons bottom row
                let row = Math.floor(i / 5);
                let col = i % 5;
                let x = anchorX - 238 + (col * 40); 
                let y = anchorY - 40 + (row * 40);
                
                alt1.overloadImg(presets[pNum], x, y, 30, 30);
            }
        }
    } else {
        document.getElementById("status-text").innerText = "Searching for Bank...";
        alt1.overloadOut();
    }
}

setInterval(main, 300);