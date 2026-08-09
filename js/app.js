const firebaseConfig = {
    apiKey: "AIzaSyDfOgdnm_-_YAhgpD-OLQO0z8tleYLzcNY",
    authDomain: "our-chat-10f48.firebaseapp.com",
    projectId: "our-chat-10f48",
    storageBucket: "our-chat-10f48.firebasestorage.app",
    messagingSenderId: "838349485901",
    appId: "1:838349485901:web:27be8e6f1117f91543a904",
    measurementId: "G-3TTYEQSJ67"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

const currentUser = localStorage.getItem('chatUser');
let lastNotificationTime = 0;
let isFirstLoad = true;

if (!currentUser) {
    window.location.href = 'index.html';
}

document.getElementById('currentUser').textContent =
    currentUser === 'hubby' ? 'Hubby' : 'Wifeyy';

// Listen for messages in real-time
db.collection('messages')
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
        const loading = document.getElementById('loading');
        if (loading) loading.remove();

        const messagesArea = document.getElementById('messagesArea');
        const wasAtBottom = messagesArea.scrollHeight - messagesArea.scrollTop <= messagesArea.clientHeight + 100;

        messagesArea.innerHTML = '';

        snapshot.forEach(doc => {
            const msg = doc.data();
            const div = document.createElement('div');
            div.classList.add('message', msg.sender);

            const time = msg.timestamp
                ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

            div.innerHTML = `
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-meta">${msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy'} · ${time}</div>
            `;
            messagesArea.appendChild(div);
        });

        if (wasAtBottom || isFirstLoad) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        // Notification for new messages from the other user (skip first load)
        if (!isFirstLoad && snapshot.docs.length > 0) {
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const lastData = lastDoc.data();
            const msgTime = lastData.timestamp ? lastData.timestamp.toMillis() : 0;

            if (lastData.sender !== currentUser && msgTime > lastNotificationTime) {
                showNotification(lastData.text, lastData.sender);
            }
            lastNotificationTime = msgTime;
        }

        if (isFirstLoad && snapshot.docs.length > 0) {
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const lastData = lastDoc.data();
            lastNotificationTime = lastData.timestamp ? lastData.timestamp.toMillis() : 0;
        }

        isFirstLoad = false;
    });

function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    db.collection('messages').add({
        sender: currentUser,
        text: text,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = '';
    input.focus();
}

document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

function switchUser() {
    localStorage.removeItem('chatUser');
    window.location.href = 'index.html';
}

function showNotification(text, sender) {
    const name = sender === 'hubby' ? 'Hubby' : 'Wifeyy';

    // Play notification sound
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            audioCtx.close();
        }, 150);
    } catch (e) {}

    // Browser notification
    if (Notification.permission === 'granted') {
        new Notification(`${name} sent a message`, { body: text });
    }
}

// Request notification permission on first interaction
document.addEventListener('click', function requestNotif() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    document.removeEventListener('click', requestNotif);
});

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
