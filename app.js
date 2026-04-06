const a1lib = new Alt1lib();
let presets = JSON.parse(localStorage.getItem("rs_preset_imgs") || "{}");
let showSettings = false;

// --- UI SETUP ---
const inputContainer = document.getElementById("inputs");
for (let i = 1; i <= 18; i++) {
    let div = document.createElement("div");
    div.className = "upload-row";
    div.innerHTML = `<span>#${i}:</span> <input type="file" accept="image/*" onchange="saveImg(${i}, this)">`;
    inputContainer.appendChild(div);
}

// Fixed Toggle Function
window.toggleSettings = function() {
    showSettings = !showSettings;
    const menu = document.getElementById("settings-menu");
    menu.style.display = showSettings ? "block" : "none";
    console.log("Settings toggled:", showSettings);
};

window.saveImg = function(num, input) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        presets[num] = e.target.result;
        localStorage.setItem("rs_preset_imgs", JSON.stringify(presets));
        console.log(`Saved image for preset ${num}`);
    };
    reader.readAsDataURL(file);
};

// --- DETECTION ENGINE ---
function main() {
    if (!window.alt1 || !alt1.permissionPixel) {
        return;
    }

    let img = a1lib.captureHoldFull();
    
    // Find the Gold Cog color (#dbab09)
    // We use a wider tolerance (dist: 20) to handle different scaling/filters
    let cog = img.findColor([219, 171, 9], 20); 

    if (cog.length > 0) {
        // To prevent false positives, we look for the "goldest" pixel in the cluster
        let anchor = cog[0];
        document.getElementById("status-text").innerText = "Bank Found!";

        // Check for Page 2
        // Look at the bottom-right button text area
        let pagePixel = img.getPixel(anchor.x - 85, anchor.y + 5);
        let isPage2 = (pagePixel.r > 180 && pagePixel.g > 180); 
        let startIdx = isPage2 ? 10 : 1;

        // Clear and Draw
        alt1.overloadOut(); 
        for (let i = 0; i < 9; i++) {
            let pNum = startIdx + i;
            if (presets[pNum]) {
                // Layout math for the 2-row preset grid
                let row = Math.floor(i / 5);
                let col = i % 5;
                
                // Based on your screenshot, the first button is ~240px left of the cog
                let x = anchor.x - 238 + (col * 40); 
                let y = anchor.y - 40 + (row * 40);
                
                alt1.overloadImg(presets[pNum], x, y, 30, 30);
            }
        }
    } else {
        document.getElementById("status-text").innerText = "Searching for Bank (Open your bank and go to Presets tab)...";
        alt1.overloadOut();
    }
}

// Start the loop
setInterval(main, 400);
