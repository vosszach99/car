let map;
let currentLocationMarker;
let destinationMarker;
let routeLayer;
let steps = [];
let currentStepIndex = 0;
let selectedVoice;

// Populate the voice selector
function populateVoiceSelector() {
    const voiceSelector = document.getElementById("voice-selector");
    const voices = speechSynthesis.getVoices();

    // Filter for English-speaking voices
    const englishVoices = voices.filter(voice => voice.lang.startsWith("en"));

    englishVoices.forEach((voice, index) => {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = `${voice.name} (${voice.lang})`;
        voiceSelector.appendChild(option);
    });

    // Set the default selected voice
    selectedVoice = englishVoices[0];
    voiceSelector.addEventListener("change", () => {
        selectedVoice = englishVoices[voiceSelector.value];
    });
}

// Speak using the selected voice
function speakDirection(direction) {
    const utterance = new SpeechSynthesisUtterance(direction);

    // Use the selected voice
    if (selectedVoice) {
        utterance.voice = selectedVoice;
    }

    speechSynthesis.speak(utterance);
}

// Ensure voices are loaded before populating the selector
speechSynthesis.onvoiceschanged = populateVoiceSelector;

// Initialize the map
function initializeMap() {
    map = L.map("map").setView([37.7749, -122.4194], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
    }).addTo(map);
}

// Get user's current location
async function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => resolve({
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                }),
                (error) => reject(error)
            );
        } else {
            reject(new Error("Geolocation not supported"));
        }
    });
}

// Update directions dynamically based on current location
async function updateCurrentStep() {
    const currentLocation = await getCurrentLocation();
    const currentDirectionEl = document.getElementById("current-direction");

    const distanceThreshold = 0.1; // Adjust as needed for accuracy
    const currentStep = steps[currentStepIndex];
    const nextStep = steps[currentStepIndex + 1];

    if (nextStep) {
        const { lat, lon } = currentStep.way_points[1];
        const distanceToNextStep = Math.sqrt(
            Math.pow(currentLocation.lat - lat, 2) +
            Math.pow(currentLocation.lon - lon, 2)
        );

        if (distanceToNextStep < distanceThreshold) {
            currentStepIndex++;
            speakDirection(nextStep.instruction);
            currentDirectionEl.textContent = nextStep.instruction;
        }
    } else {
        currentDirectionEl.textContent = "You have arrived at your destination!";
    }
}

// Search for a destination
async function searchLocation() {
    const query = document.getElementById("search-input").value;
    if (!query) return alert("Please enter a destination!");

    const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`
    );
    const data = await response.json();
    if (!data.length) return alert("Location not found!");

    const { lat, lon, display_name } = data[0];
    if (destinationMarker) map.removeLayer(destinationMarker);

    destinationMarker = L.marker([lat, lon])
        .addTo(map)
        .bindPopup(display_name)
        .openPopup();

    map.setView([lat, lon], 13);
}

// Get driving route
async function getRoute() {
    const currentLocation = await getCurrentLocation();
    if (!destinationMarker) return alert("Please select a destination!");

    const destLatLng = destinationMarker.getLatLng();
    const response = await fetch(
        `https://api.openrouteservice.org/v2/directions/driving-car?api_key=5b3ce3597851110001cf6248be4841aa57c04367a79c251139d65fee&start=${currentLocation.lon},${currentLocation.lat}&end=${destLatLng.lng},${destLatLng.lat}`
    );
    const data = await response.json();
    const coords = data.features[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    steps = data.features[0].properties.segments[0].steps;

    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.polyline(coords, { color: "blue" }).addTo(map);
    map.fitBounds(routeLayer.getBounds());

    const currentDirectionEl = document.getElementById("current-direction");
    if (steps.length > 0) {
        speakDirection(steps[0].instruction);
        currentDirectionEl.textContent = steps[0].instruction;
    }

    setInterval(updateCurrentStep, 5000); // Check every 5 seconds
}

// Attach event listeners
document.getElementById("search-btn").addEventListener("click", searchLocation);
document.getElementById("route-btn").addEventListener("click", getRoute);
document.getElementById("home-btn").addEventListener("click", () => {
    window.location.href = "index.html";
});

// Initialize components
initializeMap();

let phoneNumber = "";
const contacts = [
    { name: "Alice", number: "1234567890" },
    { name: "Bob", number: "0987654321" },
    { name: "Charlie", number: "5551234567" },
];

// Add number to the display
function addNumber(num) {
    phoneNumber += num;
    document.getElementById("phone-number").textContent = phoneNumber;
}

// Clear the phone number
function clearNumber() {
    phoneNumber = "";
    document.getElementById("phone-number").textContent = "";
}

// Simulate making a call
function makeCall() {
    if (phoneNumber) {
        alert(`Calling ${phoneNumber}...`);
    } else {
        alert("Please enter a number to call.");
    }
}

// Populate contacts dynamically
function loadContacts() {
    const contactList = document.getElementById("contact-list");
    contacts.forEach(contact => {
        const li = document.createElement("li");
        li.textContent = `${contact.name} (${contact.number})`;
        li.addEventListener("click", () => {
            phoneNumber = contact.number;
            document.getElementById("phone-number").textContent = phoneNumber;
        });
        contactList.appendChild(li);
    });
}

// Search for a contact
function searchContact() {
    const query = document.getElementById("search-contact").value.toLowerCase();
    const filteredContacts = contacts.filter(contact =>
        contact.name.toLowerCase().includes(query)
    );

    const contactList = document.getElementById("contact-list");
    contactList.innerHTML = ""; // Clear previous results
    filteredContacts.forEach(contact => {
        const li = document.createElement("li");
        li.textContent = `${contact.name} (${contact.number})`;
        li.addEventListener("click", () => {
            phoneNumber = contact.number;
            document.getElementById("phone-number").textContent = phoneNumber;
        });
        contactList.appendChild(li);
    });
}

// Voice input for dialing
function startVoiceInput() {
    if (!("webkitSpeechRecognition" in window)) {
        alert("Voice recognition not supported in this browser.");
        return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";

    recognition.onresult = function (event) {
        const speechResult = event.results[0][0].transcript;
        alert(`You said: ${speechResult}`);
        const matchedContact = contacts.find(contact =>
            contact.name.toLowerCase() === speechResult.toLowerCase()
        );
        if (matchedContact) {
            phoneNumber = matchedContact.number;
            document.getElementById("phone-number").textContent = phoneNumber;
            alert(`Dialing ${matchedContact.name}...`);
        } else {
            alert("Contact not found.");
        }
    };

    recognition.onerror = function () {
        alert("Voice recognition failed. Please try again.");
    };

    recognition.start();
}

// Initialize the page
loadContacts();
