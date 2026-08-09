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
let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let editingMessageId = null;
let isRecording = false;

if (!currentUser) {
    window.location.href = 'index.html';
}

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    document.getElementById('themeBtn').innerHTML = '&#9728;';
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
            const isOwn = msg.sender === currentUser;
            div.classList.add('message', isOwn ? 'own' : 'other', msg.sender);

            const time = msg.timestamp
                ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

            // Handle deleted messages
            if (msg.deleted) {
                const deletedBy = msg.deletedBy === 'hubby' ? 'Hubby' : 'Wifeyy';
                div.innerHTML = `
                    <div class="deleted-msg">
                        <span class="deleted-icon">&#128465;</span>
                        This message was deleted by ${deletedBy}
                    </div>
                    <div class="message-meta">${msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy'} · ${time}</div>
                `;
                messagesArea.appendChild(div);
                return;
            }

            let mediaHtml = '';

            if (msg.type === 'image' && msg.fileData) {
                mediaHtml = `<div class="message-media"><img src="${msg.fileData}" onclick="openLightbox(this.src)" alt="photo"></div>`;
            } else if (msg.type === 'video' && msg.fileData) {
                mediaHtml = `<div class="message-media"><video src="${msg.fileData}" controls preload="metadata"></video></div>`;
            } else if (msg.type === 'audio' && msg.fileData) {
                mediaHtml = `<div class="message-media"><audio src="${msg.fileData}" controls preload="metadata"></audio></div>`;
            } else if (msg.type === 'file' && msg.fileData) {
                const icon = getFileIcon(msg.fileName);
                mediaHtml = `<div class="message-media"><a class="file-card" href="${msg.fileData}" target="_blank" download="${msg.fileName}"><span class="file-icon">${icon}</span><div class="file-info"><div class="file-name">${escapeHtml(msg.fileName)}</div><div class="file-size">${msg.fileSize || ''}</div></div></a></div>`;
            }

            const editedLabel = msg.edited ? ' · <span class="edited-label">edited</span>' : '';

            let actionBtns = '';
            if (isOwn) {
                if (msg.type === 'text' && msg.text) {
                    actionBtns += `<button class="msg-edit-btn" onclick="event.stopPropagation(); openEditModal('${doc.id}', '${escapeHtml(msg.text).replace(/'/g, "\\'")}')">&#9998;</button>`;
                }
                actionBtns += `<button class="msg-delete-btn" onclick="event.stopPropagation(); deleteMessage('${doc.id}')">&#128465;</button>`;
            }

            div.innerHTML = `
                <div class="message-row">
                    ${mediaHtml}
                    ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ''}
                    ${actionBtns}
                </div>
                <div class="message-meta">${msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy'} · ${time}${editedLabel}</div>
            `;

            messagesArea.appendChild(div);
        });

        if (wasAtBottom || isFirstLoad) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }

        if (!isFirstLoad && snapshot.docs.length > 0) {
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const lastData = lastDoc.data();
            const msgTime = lastData.timestamp ? lastData.timestamp.toMillis() : 0;

            if (lastData.sender !== currentUser && msgTime > lastNotificationTime) {
                let notifText = 'Sent a message';
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

// File upload via click
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (!file) return;
    handleFile(file);
    this.value = '';
});

function handleFile(file) {
    const progressEl = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    progressEl.style.display = 'block';
    progressFill.style.width = '30%';
    progressText.textContent = 'Processing...';

    const reader = new FileReader();

    reader.onprogress = (e) => {
        if (e.lengthComputable) {
            const pct = (e.loaded / e.total) * 100;
            progressFill.style.width = pct + '%';
        }
    };

    reader.onload = () => {
        progressFill.style.width = '70%';
        progressText.textContent = 'Compressing...';

        let type = 'file';
        if (file.type.startsWith('image/')) type = 'image';
        else if (file.type.startsWith('video/')) type = 'video';
        else if (file.type.startsWith('audio/')) type = 'audio';

        if (type === 'image') {
            compressImage(reader.result, file.name, progressEl, progressFill, progressText);
        } else {
            saveToFirestore(type, reader.result, file.name, file.size, progressEl, progressFill, progressText);
        }
    };

    reader.onerror = () => {
        progressEl.style.display = 'none';
        alert('Failed to read file.');
    };

    reader.readAsDataURL(file);
}

function compressImage(dataUrl, fileName, progressEl, progressFill, progressText) {
    const img = new Image();
    img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Max dimensions
        const MAX = 800;
        if (width > MAX || height > MAX) {
            if (width > height) {
                height = (height / width) * MAX;
                width = MAX;
            } else {
                width = (width / height) * MAX;
                height = MAX;
            }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG
        let compressed = canvas.toDataURL('image/jpeg', 0.7);

        // If still too big (>500KB), compress more
        if (compressed.length > 640000) {
            compressed = canvas.toDataURL('image/jpeg', 0.4);
        }

        progressFill.style.width = '90%';
        progressText.textContent = 'Sending...';

        saveToFirestore('image', compressed, fileName, compressed.length, progressEl, progressFill, progressText);
    };
    img.src = dataUrl;
}

function saveToFirestore(type, fileData, fileName, fileSize, progressEl, progressFill, progressText) {
    progressFill.style.width = '90%';
    progressText.textContent = 'Sending...';

    db.collection('messages').add({
        sender: currentUser,
        text: '',
        type: type,
        fileData: fileData,
        fileName: fileName,
        fileSize: formatFileSize(fileSize),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    }).then(() => {
        progressEl.style.display = 'none';
    }).catch(err => {
        console.error('Error saving message:', err);
        progressEl.style.display = 'none';
        if (err.message.includes('maximum size')) {
            alert('File is too large. Try a smaller file.');
        } else {
            alert('Failed to send: ' + err.message);
        }
    });
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

function getFileIcon(fileName) {
    const ext = fileName.split('.').pop().toLowerCase();
    const icons = {
        pdf: '\uD83D\uDCC4', doc: '\uD83D\uDCDD', docx: '\uD83D\uDCDD', txt: '\uD83D\uDCC4',
        zip: '\uD83D\uDDDC\uFE0F', rar: '\uD83D\uDDDC\uFE0F',
        xls: '\uD83D\uDCCA', xlsx: '\uD83D\uDCCA', csv: '\uD83D\uDCCA',
        ppt: '\uD83D\uDCCA', pptx: '\uD83D\uDCCA',
        mp3: '\uD83C\uDFB5', wav: '\uD83C\uDFB5', ogg: '\uD83C\uDFB5', m4a: '\uD83C\uDFB5',
        mp4: '\uD83C\uDFAC', mov: '\uD83C\uDFAC', avi: '\uD83C\uDFAC', mkv: '\uD83C\uDFAC',
        jpg: '\uD83D\uDDBC\uFE0F', jpeg: '\uD83D\uDDBC\uFE0F', png: '\uD83D\uDDBC\uFE0F', gif: '\uD83D\uDDBC\uFE0F', webp: '\uD83D\uDDBC\uFE0F'
    };
    return icons[ext] || '\uD83D\uDCC1';
}

// Voice recording
function startRecording() {
    if (isRecording) return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording not supported in this browser.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            isRecording = true;
            audioChunks = [];

            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

            mediaRecorder = new MediaRecorder(stream, { mimeType: mimeType });

            mediaRecorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                isRecording = false;
                stream.getTracks().forEach(track => track.stop());

                document.getElementById('micBtn').classList.remove('recording');
                document.getElementById('recordingIndicator').style.display = 'none';

                if (recordingTimer) {
                    clearInterval(recordingTimer);
                    recordingTimer = null;
                }

                if (audioChunks.length === 0) return;

                const audioBlob = new Blob(audioChunks, { type: mimeType });

                // Convert to base64
                const reader = new FileReader();
                reader.onloadend = () => {
                    const progressEl = document.getElementById('uploadProgress');
                    const progressFill = document.getElementById('progressFill');
                    const progressText = document.getElementById('progressText');

                    progressEl.style.display = 'block';
                    progressFill.style.width = '50%';
                    progressText.textContent = 'Sending voice message...';

                    saveToFirestore('audio', reader.result, `voice_${Date.now()}.webm`, audioBlob.size, progressEl, progressFill, progressText);
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.onerror = (e) => {
                console.error('MediaRecorder error:', e);
                isRecording = false;
                stream.getTracks().forEach(track => track.stop());
                document.getElementById('micBtn').classList.remove('recording');
                document.getElementById('recordingIndicator').style.display = 'none';
                if (recordingTimer) {
                    clearInterval(recordingTimer);
                    recordingTimer = null;
                }
                alert('Recording failed. Please try again.');
            };

            mediaRecorder.start(100);

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
            console.error('Microphone error:', err);
            alert('Could not access microphone. Please allow microphone permission and try again.');
        });
}

function stopRecording(e) {
    if (e) e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

// Prevent context menu on mic button
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

function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    localStorage.setItem('darkMode', isDark);
    document.getElementById('themeBtn').innerHTML = isDark ? '&#9728;' : '&#9790;';
}

function showNotification(text, sender) {
    const name = sender === 'hubby' ? 'Hubby' : 'Wifeyy';

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

    if (Notification.permission === 'granted') {
        new Notification(`${name} sent a message`, { body: text });
    }
}

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

let pendingDeleteId = null;

function deleteMessage(messageId) {
    pendingDeleteId = messageId;

    const existing = document.getElementById('confirmModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'confirmModal';
    modal.className = 'edit-modal-overlay';
    modal.onclick = (e) => { if (e.target === modal) closeConfirm(); };

    modal.innerHTML = `
        <div class="edit-modal">
            <h3>Delete Message</h3>
            <p style="font-size:0.9rem; color:#6e6e73; margin-bottom:1rem;">Are you sure you want to delete this message?</p>
            <div class="edit-modal-actions">
                <button class="edit-cancel-btn" onclick="closeConfirm()">Cancel</button>
                <button class="edit-save-btn" style="background:#ff3b30;" onclick="confirmDelete()">Delete</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function closeConfirm() {
    const modal = document.getElementById('confirmModal');
    if (modal) modal.remove();
    pendingDeleteId = null;
}

function confirmDelete() {
    if (!pendingDeleteId) return;

    db.collection('messages').doc(pendingDeleteId).update({
        deleted: true,
        deletedBy: currentUser,
        text: '',
        fileData: null,
        fileName: null,
        fileSize: null,
        type: 'deleted'
    });

    closeConfirm();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
