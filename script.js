// Create a Web Worker
const workerBlob = new Blob([`
  self.addEventListener('message', async (e) => {
    const { url, options } = e.data;
    try {
      const response = await fetch(url, options);
      const data = await response.json();
      self.postMessage({ success: true, data });
    } catch (error) {
      self.postMessage({ success: false, error: error.message });
    }
  });
`], { type: 'application/javascript' });

const workerUrl = URL.createObjectURL(workerBlob);
const worker = new Worker(workerUrl);

// Function to make CORS requests
function makeCorsRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    worker.onmessage = (e) => {
      if (e.data.success) {
        resolve(e.data.data);
      } else {
        reject(new Error(e.data.error));
      }
    };
    worker.postMessage({ url, options });
  });
}

// Function to format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Function to update stats and feedback display
function updateDisplay(data) {
    if (data.profile && data.profile.feedback) {
        const feedback = data.profile.feedback;
        document.getElementById('feedback-positive').textContent = formatNumber(feedback.positive || 0);
        document.getElementById('feedback-neutral').textContent = formatNumber(feedback.neutral || 0);
        document.getElementById('csrep-crypto').textContent = formatNumber(feedback.crypto || 0);
        document.getElementById('csrep-balance').textContent = formatNumber(feedback.balance || 0);
        document.getElementById('csrep-cash').textContent = formatNumber(feedback.cash || 0);
    }
}

// Function to fetch CSRep data
async function fetchCSRepData() {
    try {
        const jsonData = await makeCorsRequest('https://api.csgo-rep.com/', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "*/*",
            },
            body: JSON.stringify({
                id: "206",
                query: {
                    steam_id: "76561198419623767"
                }
            })
        });

        updateDisplay(jsonData);

        // Cache the data
        localStorage.setItem('csrepData', JSON.stringify({
            data: jsonData,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error fetching CSRep data:', error);

        // Try to use cached data
        const cached = localStorage.getItem('csrepData');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < 3600000) { // 1 hour
                updateDisplay(data);
                return;
            }
        }

        // Show error state
        updateDisplay({
            profile: {
                score: 'Error',
                trades: 'Error',
                volume: 'Error',
                feedback: {
                    positive: 'Error',
                    negative: 'Error',
                    neutral: 'Error'
                }
            }
        });
    }
}

// Initialize with loading state
document.querySelectorAll('.stat-value').forEach(el => {
    el.textContent = 'Loading...';
});

// Try to show cached stats immediately
const cached = localStorage.getItem('csrepData');
if (cached) {
    const { data } = JSON.parse(cached);
    updateDisplay(data);
}

// Fetch fresh stats
fetchCSRepData();

// Update every 5 minutes
setInterval(fetchCSRepData, 300000);

// Add this function near the top of your script.js
async function fetchInfoText() {
    try {
        const response = await fetch('info.json');
        const data = await response.json();
        const infoText = document.querySelector('.info-text');
        if (infoText && data.infoText) {
            infoText.textContent = data.infoText;
        }
    } catch (error) {
        console.error('Error loading info text:', error);
        // Fallback text if json fails to load
        document.querySelector('.info-text').textContent = 'Error loading info...';
    }
}

// Update the DOMContentLoaded event listener
document.addEventListener('DOMContentLoaded', function() {
    const infoText = document.querySelector('.info-text');
    const saveButton = document.querySelector('.save-info');
    
    // Load info from JSON instead of localStorage
    fetchInfoText();
    
    // Remove localStorage related code since we're using JSON file now
    saveButton.style.display = 'none'; // Hide save button since we're not saving
    infoText.setAttribute('contenteditable', 'false'); // Make text non-editable
});