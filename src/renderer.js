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
        });
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
            console.log("Reached here")
        });

        // Clear the input field after sending
        messageInput.value = '';
    });
} catch (err) {
    console.error('Error setting up swarm:', err);
}

// Function to display messages in the UI
function displayMessage(message) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    messagesDiv.appendChild(messageElement);
}
