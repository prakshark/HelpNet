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
const sendSOSButton = document.getElementById('sos'); // Get the SOS button
const survivorsCount = document.getElementById('survivors'); // Get the survivors count display

// Initialize map (Leaflet)
const map = L.map('map').setView([51.505, -0.09], 2); // Default map center
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

let userLocation = null;

// Join the swarm
try {
    console.log(`Joining swarm with topic: ${topic.toString('hex')}`);
    swarm.join(topic, {
        lookup: true, // Find peers
        announce: true, // Announce ourselves to the DHT
    });

    swarm.on('connection', (peer, details) => {
        console.log('Connected to a peer:', details);
        
        // Listen for data from the peer
        peer.on('data', (data) => {
            const message = data.toString();
            console.log('Received message:', message);
            displayMessage(`Peer: ${message}`);
        });

        // Handle disconnection
        peer.on('close', () => {
            console.log('Peer disconnected');
            updateSurvivorsOnlineCount();
        });

        // Update survivors count whenever a new peer connects
        updateSurvivorsOnlineCount();
    });

    // Handle message sending
    sendMessageButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message === '') {
            console.log('Message input is empty, not sending.');
            return;
        }

        console.log(`Sending message to peers: ${message}`);
        displayMessage(`You: ${message}`);

        // Send the message to all connected peers
        swarm.connections.forEach((peer) => {
            peer.write(message);
            console.log("Message sent to peer.");
        });

        // Clear the input field after sending
        messageInput.value = '';
    });

    // Handle SOS button click
    sendSOSButton.addEventListener('click', () => {
        const sosMessage = "IMMEDIATE EMERGENCY !!!"; // The SOS message
        console.log(`Sending SOS message: ${sosMessage}`);

        // Send the SOS message to all connected peers
        swarm.connections.forEach((peer) => {
            peer.write(sosMessage);
            console.log("SOS message sent to peer.");
        });

        // Display the SOS message in the sender's UI
        displayMessage(`You: ${sosMessage}`);
    });

    // Handle geolocation functionality for the map
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };

            // Add user's marker to the map
            L.marker([userLocation.lat, userLocation.lng]).addTo(map)
                .bindPopup("You are here!")
                .openPopup();

            // Update survivor locations on the map
            swarm.on('connection', (peer, details) => {
                peer.on('data', (data) => {
                    const peerLocation = JSON.parse(data.toString());
                    L.marker([peerLocation.lat, peerLocation.lng]).addTo(map)
                        .bindPopup(`Peer at: ${peerLocation.lat}, ${peerLocation.lng}`)
                        .openPopup();
                });
            });

            // Broadcast the user's location to peers
            swarm.connections.forEach((peer) => {
                peer.write(JSON.stringify(userLocation));
                console.log('Broadcasted location to peer.');
            });

        }, (err) => {
            console.error("Error getting geolocation: ", err);
        });
    } else {
        console.log("Geolocation is not supported by this browser.");
    }

} catch (err) {
    console.error('Error setting up swarm:', err);
}

// Function to display messages in the UI
function displayMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
}

// Function to update the survivors count
function updateSurvivorsOnlineCount() {
    const survivorsCountValue = swarm.connections.size;
    survivorsCount.textContent = survivorsCountValue;
}
