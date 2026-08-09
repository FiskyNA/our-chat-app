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
const storage = firebase.storage();

const currentUser = localStorage.getItem('chatUser');
let lastNotificationTime = 0;
let isFirstLoad = true;
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let editingMessageId = null;

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

            let mediaHtml = '';

            // Image
            if (msg.type === 'image' && msg.fileUrl) {
                mediaHtml = `<div class="message-media"><img src="${msg.fileUrl}" onclick="openLightbox('${msg.fileUrl}')" alt="photo"></div>`;
            }
            // Video
            else if (msg.type === 'video' && msg.fileUrl) {
                mediaHtml = `<div class="message-media"><video src="${msg.fileUrl}" controls preload="metadata"></video></div>`;
            }
            // Audio / Voice
            else if (msg.type === 'audio' && msg.fileUrl) {
                mediaHtml = `<div class="message-media"><audio src="${msg.fileUrl}" controls preload="metadata"></audio></div>`;
            }
            // Document / File
            else if (msg.type === 'file' && msg.fileUrl) {
                const icon = getFileIcon(msg.fileName);
                mediaHtml = `<div class="message-media"><a class="file-card" href="${msg.fileUrl}" target="_blank" download="${msg.fileName}"><span class="file-icon">${icon}</span><div class="file-info"><div class="file-name">${escapeHtml(msg.fileName)}</div><div class="file-size">${msg.fileSize || ''}</div></div></a></div>`;
            }

            const editedLabel = msg.edited ? ' · <span class="edited-label">edited</span>' : '';

            div.innerHTML = `
                ${mediaHtml}
                ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ''}
                <div class="message-meta">${msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy'} · ${time}${editedLabel}</div>
            `;

            // Only allow editing own text messages
            if (msg.sender === currentUser && msg.type === 'text' && msg.text) {
                div.style.cursor = 'pointer';
                div.addEventListener('dblclick', () => openEditModal(doc.id, msg.text));
                // Long press for mobile
                let pressTimer;
                div.addEventListener('touchstart', (e) => {
                    pressTimer = setTimeout(() => openEditModal(doc.id, msg.text), 500);
                });
                div.addEventListener('touchend', () => clearTimeout(pressTimer));
                div.addEventListener('touchmove', () => clearTimeout(pressTimer));
            }

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
                let notifText = 'Sent a file';
                if (lastData.type === 'image') notifText = 'Sent a photo';
                else if (lastData.type === 'video') notifText = 'Sent a video';
                else if (lastData.type === 'audio') notifText = 'Sent a voice message';
                else if (lastData.type === 'file') notifText = 'Sent a file';
                else if (lastData.text) notifText = lastData.text;

                showNotification(notifText, lastData.sender);
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

// Send text message
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text) return;

    db.collection('messages').add({
        sender: currentUser,
        text: text,
        type: 'text',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });

    input.value = '';
    input.focus();
}

document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

// File upload
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    uploadFile(file);
    this.value = '';
});

function uploadFile(file) {
    const progressEl = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressEl.style.display = 'block';
    progressFill.style.width = '0%';
    progressText.textContent = 'Uploading...';

    const fileName = `${Date.now()}_${file.name}`;
    const fileRef = storage.ref(`chat-files/${fileName}`);
    const uploadTask = fileRef.put(file);

    uploadTask.on('state_changed',
        (snapshot) => {
            const pct = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressFill.style.width = pct + '%';
            progressText.textContent = `Uploading ${Math.round(pct)}%`;
        },
        (error) => {
            progressEl.style.display = 'none';
            alert('Upload failed: ' + error.message);
        },
        () => {
            uploadTask.snapshot.ref.getDownloadURL().then(downloadURL => {
                progressEl.style.display = 'none';

                let type = 'file';
                if (file.type.startsWith('image/')) type = 'image';
                else if (file.type.startsWith('video/')) type = 'video';
                else if (file.type.startsWith('audio/')) type = 'audio';

                db.collection('messages').add({
                    sender: currentUser,
                    text: '',
                    type: type,
                    fileUrl: downloadURL,
                    fileName: file.name,
                    fileSize: formatFileSize(file.size),
                    timestamp: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        }
    );
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        pdf: '📄', doc: '📝', docx: '📝', txt: '📄',
        zip: '🗜️', rar: '🗜️',
        xls: '📊', xlsx: '📊', csv: '📊',
        ppt: '📊', pptx: '📊',
        mp3: '🎵', wav: '🎵', ogg: '🎵', m4a: '🎵',
        mp4: '🎬', mov: '🎬', avi: '🎬', mkv: '🎬',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️'
    };
    return icons[ext] || '📁';
}

// Voice recording
function startRecording() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording not supported in this browser.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioChunks = [];
            mediaRecorder = new MediaRecorder(stream);

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = () => {
                stream.getTracks().forEach(track => track.stop());
                if (audioChunks.length === 0) return;

                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                const audioFile = new File([audioBlob], `voice_${Date.now()}.webm`, { type: 'audio/webm' });
                uploadFile(audioFile);
            };

            mediaRecorder.start();

            document.getElementById('micBtn').classList.add('recording');
            document.getElementById('recordingIndicator').style.display = 'flex';

            recordingSeconds = 0;
            document.getElementById('recTimer').textContent = '0:00';
            recordingTimer = setInterval(() => {
                recordingSeconds++;
                const min = Math.floor(recordingSeconds / 60);
                const sec = recordingSeconds % 60;
                document.getElementById('recTimer').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
            }, 1000);
        })
        .catch(err => {
            alert('Microphone access denied.');
        });
}

function stopRecording(e) {
    if (e) e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }

    document.getElementById('micBtn').classList.remove('recording');
    document.getElementById('recordingIndicator').style.display = 'none';

    if (recordingTimer) {
        clearInterval(recordingTimer);
        recordingTimer = null;
    }
}

// Prevent context menu on mic button (mobile long press)
document.getElementById('micBtn').addEventListener('contextmenu', e => e.preventDefault());

// Lightbox for images
function openLightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.onclick = () => lb.remove();
    const img = document.createElement('img');
    img.src = url;
    lb.appendChild(img);
    document.body.appendChild(lb);
}

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

function openEditModal(messageId, currentText) {
    editingMessageId = messageId;

    const existing = document.getElementById('editModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'editModal';
    modal.className = 'edit-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) closeModal(); };

    modal.innerHTML = `
        <div class="edit-modal">
            <h3>Edit Message</h3>
            <input type="text" id="editInput" value="${escapeHtml(currentText)}" autocomplete="off">
            <div class="edit-modal-actions">
                <button class="edit-cancel-btn" onclick="closeModal()">Cancel</button>
                <button class="edit-save-btn" onclick="saveEdit()">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const input = document.getElementById('editInput');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('keypress', (e) => { if (e.key === 'Enter') saveEdit(); });
}

function closeModal() {
    const modal = document.getElementById('editModal');
    if (modal) modal.remove();
    editingMessageId = null;
}

function saveEdit() {
    const input = document.getElementById('editInput');
    const newText = input.value.trim();
    if (!newText || !editingMessageId) return;

    db.collection('messages').doc(editingMessageId).update({
        text: newText,
        edited: true
    });

    closeModal();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
