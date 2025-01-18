const Hyperswarm = require('hyperswarm');
const crypto = require('crypto');

// Create a new Hyperswarm instance
const swarm = new Hyperswarm();

// The topic for the swarm (hashed to a 32-byte Buffer)
const topic = crypto.createHash('sha256').update('helpnet-p2p').digest();

// Elements in the DOM
const sendMessageButton = document.getElementById('sendMessageButton');
const messageInput = document.getElementById('messageInput');
const messagesDiv = document.getElementById('messages');
const sendSOSButton = document.getElementById('sos');
const survivorsCount = document.getElementById('survivors');
const checkInSafeButton = document.getElementById('checkInSafe');
const safeList = document.getElementById('safeList');

// Initialize map (Leaflet)
const map = L.map('map').setView([28.6139, 77.2089], 10); // Default to Noida
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let userLocation = null;

// Create a custom check-in input dialog
function showCheckInDialog(callback) {
    const inputDiv = document.createElement('div');
    inputDiv.style.position = 'fixed';
    inputDiv.style.top = '50%';
    inputDiv.style.left = '50%';
    inputDiv.style.transform = 'translate(-50%, -50%)';
    inputDiv.style.background = '#fff';
    inputDiv.style.padding = '20px';
    inputDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';
    inputDiv.style.zIndex = '1000';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.placeholder = 'Enter your name';
    inputField.style.width = '100%';
    inputField.style.marginBottom = '10px';

    const submitButton = document.createElement('button');
    submitButton.textContent = 'Submit';
    submitButton.style.marginRight = '10px';

    const cancelButton = document.createElement('button');
    cancelButton.textContent = 'Cancel';

    inputDiv.appendChild(inputField);
    inputDiv.appendChild(submitButton);
    inputDiv.appendChild(cancelButton);
    document.body.appendChild(inputDiv);

    submitButton.addEventListener('click', () => {
        const name = inputField.value.trim();
        document.body.removeChild(inputDiv);
        callback(name);
    });

    cancelButton.addEventListener('click', () => {
        document.body.removeChild(inputDiv);
        callback(null);
    });
}

// Join the swarm
try {
    console.log(`Joining swarm with topic: ${topic.toString('hex')}`);
    swarm.join(topic, {
        lookup: true,
        announce: true,
    });

    swarm.on('connection', (peer, details) => {
        console.log('Connected to a peer:', details);

        peer.on('data', (data) => {
            const message = data.toString();
            console.log('Received message:', message);
            displayMessage(`Peer: ${message}`);

            // Handle safety check-in messages
            if (message.startsWith('SAFE:')) {
                const safeName = message.substring(5);
                addSafeUserToList(safeName);
            }
        });

        peer.on('close', () => {
            console.log('Peer disconnected');
            updateSurvivorsOnlineCount();
        });

        updateSurvivorsOnlineCount();
    });

    sendMessageButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message === '') return;

        console.log(`Sending message to peers: ${message}`);
        displayMessage(`You: ${message}`);

        swarm.connections.forEach((peer) => peer.write(message));
        messageInput.value = '';
    });

    sendSOSButton.addEventListener('click', () => {
        const sosMessage = 'IMMEDIATE EMERGENCY !!!';
        console.log(`Sending SOS message: ${sosMessage}`);

        swarm.connections.forEach((peer) => peer.write(sosMessage));
        displayMessage(`You: ${sosMessage}`);
    });

    checkInSafeButton.addEventListener('click', () => {
        showCheckInDialog((name) => {
            if (!name) return; // User canceled or entered nothing
            const safeMessage = `SAFE:${name}`;
            console.log(`Checking in as safe: ${name}`);

            swarm.connections.forEach((peer) => peer.write(safeMessage));
            addSafeUserToList(name); // Add yourself to the safe list
        });
    });

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
                L.marker([userLocation.lat, userLocation.lng]).addTo(map).bindPopup('You are here!').openPopup();

                swarm.connections.forEach((peer) =>
                    peer.write(JSON.stringify(userLocation))
                );
            },
            (err) => {
                console.error('Error getting geolocation:', err);
                const fallbackLocation = { lat: 28.6139, lng: 77.2089 };
                userLocation = fallbackLocation;
                L.marker([fallbackLocation.lat, fallbackLocation.lng]).addTo(map).bindPopup('Default Location').openPopup();
            },
            { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 }
        );
    } else {
        console.log('Geolocation not supported, using default location.');
        const fallbackLocation = { lat: 28.6139, lng: 77.2089 };
        userLocation = fallbackLocation;
        L.marker([fallbackLocation.lat, fallbackLocation.lng]).addTo(map).bindPopup('Default Location').openPopup();
    }
} catch (err) {
    console.error('Error setting up swarm:', err);
}

function displayMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
}

function updateSurvivorsOnlineCount() {
    const survivorsCountValue = swarm.connections.size;
    survivorsCount.textContent = survivorsCountValue;
}

function addSafeUserToList(name) {
    const listItem = document.createElement('li');
    listItem.textContent = name;
    safeList.appendChild(listItem);
}
