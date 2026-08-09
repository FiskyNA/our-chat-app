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
const otherUser = currentUser === 'hubby' ? 'wifeyy' : 'hubby';
const currentName = currentUser === 'hubby' ? 'Hubby' : 'Wifeyy';
const otherName = currentUser === 'hubby' ? 'Wifeyy' : 'Hubby';

let mediaRecorder = null;
let audioChunks = [];
let recordingTimer = null;
let recordingSeconds = 0;
let editingMessageId = null;
let isRecording = false;
let lastRenderedIds = [];
let selectedMessageId = null;
let selectedMessageData = null;
let replyingTo = null;
let typingTimeout = null;
let contextMenuTimeout = null;

if (!currentUser) {
    window.location.href = 'index.html';
}

// Load dark mode
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    document.getElementById('themeBtn').innerHTML = '&#9728;';
}

document.getElementById('currentUser').textContent = currentName;

// ===== EMOJI PICKER =====
const emojis = ['😀','😂','😍','🥰','😘','😭','🥺','🔥','❤️','💕','👍','👋','🎉','✨','💪','🙌','😏','🤔','😢','😡','🥺','😱','🤗','😴','🤮','🤧','💀','👀','🤡','💎','🌹','🦋','🌈','⭐','💫','🎵','📸','💌','🧸'];

function initEmojiPicker() {
    const grid = document.getElementById('emojiGrid');
    emojis.forEach(emoji => {
        const btn = document.createElement('button');
        btn.className = 'emoji-item';
        btn.textContent = emoji;
        btn.onclick = () => insertEmoji(emoji);
        grid.appendChild(btn);
    });
}

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
    closeContextMenu();
    closeReactionPicker();
    closeGifPicker();
    closeStickerPicker();
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// ===== GIF PICKER =====
function toggleGifPicker() {
    const picker = document.getElementById('gifPicker');
    const isOpen = picker.style.display !== 'none';
    closeAllPickers();
    if (!isOpen) {
        picker.style.display = 'block';
        loadTrendingGifs();
    }
}

function closeGifPicker() {
    document.getElementById('gifPicker').style.display = 'none';
}

function closeStickerPicker() {
    document.getElementById('stickerPicker').style.display = 'none';
}

function closeAllPickers() {
    document.getElementById('emojiPicker').style.display = 'none';
    document.getElementById('gifPicker').style.display = 'none';
    document.getElementById('stickerPicker').style.display = 'none';
    closeReactionPicker();
    closeContextMenu();
}

async function loadTrendingGifs() {
    const grid = document.getElementById('gifGrid');
    grid.innerHTML = '<div class="gif-loading">Loading...</div>';
    try {
        const res = await fetch('https://api.giphy.com/v1/gifs/trending?api_key=dc6zaTOxFJmzC&limit=30&rating=g');
        const data = await res.json();
        renderGifs(data.data || []);
    } catch (e) {
        grid.innerHTML = '<div class="gif-loading">Failed to load GIFs</div>';
    }
}

async function searchGifs() {
    const query = document.getElementById('gifSearchInput').value.trim();
    if (!query) return;
    const grid = document.getElementById('gifGrid');
    grid.innerHTML = '<div class="gif-loading">Searching...</div>';
    try {
        const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(query)}&limit=30&rating=g`);
        const data = await res.json();
        renderGifs(data.data || []);
    } catch (e) {
        grid.innerHTML = '<div class="gif-loading">Search failed</div>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const gifInput = document.getElementById('gifSearchInput');
    if (gifInput) {
        gifInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') searchGifs();
        });
    }
});

function renderGifs(gifs) {
    const grid = document.getElementById('gifGrid');
    grid.innerHTML = '';
    gifs.forEach(gif => {
        const url = gif.images?.fixed_height?.url || gif.images?.original?.url;
        if (!url) return;
        const img = document.createElement('img');
        img.className = 'gif-item';
        img.src = url;
        img.alt = 'gif';
        img.loading = 'lazy';
        img.onclick = () => sendGif(url);
        grid.appendChild(img);
    });
}

function sendGif(url) {
    const msg = {
        type: 'image',
        fileData: url,
        fileName: 'gif',
        text: '',
        sender: currentUser,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        reactions: {}
    };
    db.collection('messages').add(msg);
    closeGifPicker();
}

// ===== STICKER PICKER =====
const stickerSets = [
    { category: 'Happy', stickers: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝'] },
    { category: 'Love', stickers: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','💕','💞','💓','💗','💖','💘','💝','💟','💋','😍','🥰','😘','💑'] },
    { category: 'Gestures', stickers: ['👍','👎','👏','🙌','🤝','🙏','💪','🫶','✌️','🤞','🤟','🤘','🤙','👋','🤚','🖐️','✋','🖖','🫱','🫲','🫳','🫴','👌','🫵'] },
    { category: 'Angry', stickers: ['😡','😠','🤬','💢','💥','👊','✊','😤','🤥','😒','🙄','😬','🤥','🫠','🤯','😵','😵‍💫','🤯','🤫','🤭','🫢','🧐','😕','🫤'] },
    { category: 'Animals', stickers: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐻‍❄️','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐒','🐔','🐧','🐦','🐤'] },
    { category: 'Food', stickers: ['🍕','🍔','🍟','🌭','🍿','🧂','🥓','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌮','🌯','🫔','🥙','🧆','🥗','🫕','🥘','🍝'] },
    { category: 'Nature', stickers: ['🌸','💐','🌷','🌹','🌺','🌻','🌼','🍀','🌿','🍃','🍂','🍁','🌾','🌵','🌴','🌳','🌲','🪵','🍄','🐚','🪸','🪨','🌊','⛅'] },
    { category: 'Objects', stickers: ['🎉','🎊','🎈','🎁','🎀','🏆','⚽','🏀','🎮','🎲','🎯','🎨','🎸','🎤','🎧','📱','💻','⌨️','📷','🔑','💎','🔮','🪄','🧸'] }
];

function toggleStickerPicker() {
    const picker = document.getElementById('stickerPicker');
    const isOpen = picker.style.display !== 'none';
    closeAllPickers();
    if (!isOpen) {
        picker.style.display = 'block';
        loadStickers();
    }
}

function loadStickers() {
    const grid = document.getElementById('stickerGrid');
    if (grid.children.length > 0) return;
    grid.innerHTML = '';
    stickerSets.forEach(set => {
        const header = document.createElement('div');
        header.className = 'sticker-category';
        header.textContent = set.category;
        grid.appendChild(header);
        const row = document.createElement('div');
        row.className = 'sticker-row';
        set.stickers.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'sticker-btn-item';
            btn.textContent = s;
            btn.onclick = () => sendSticker(s);
            row.appendChild(btn);
        });
        grid.appendChild(row);
    });
}

function sendSticker(emoji) {
    const msg = {
        type: 'text',
        text: emoji,
        sender: currentUser,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        reactions: {}
    };
    db.collection('messages').add(msg);
    closeStickerPicker();
}

// ===== TYPING INDICATOR =====
let typingRef = null;

function initTyping() {
    typingRef = db.collection('presence').doc(currentUser);
    typingRef.set({ typing: false, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
}

function setTyping(isTyping) {
    if (typingRef) {
        typingRef.set({ typing: isTyping, lastSeen: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
}

function watchTyping() {
    db.collection('presence').doc(otherUser).onSnapshot(doc => {
        const data = doc.data();
        const indicator = document.getElementById('typingIndicator');
        if (data && data.typing) {
            indicator.textContent = `${otherName} is typing...`;
        } else {
            indicator.textContent = '';
        }
    });
}

document.getElementById('messageInput').addEventListener('input', () => {
    setTyping(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => setTyping(false), 2000);
});

// ===== DATE SEPARATORS =====
function getDateLabel(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function shouldShowDateSeparator(current, previous) {
    if (!previous) return true;
    if (!current || !current.timestamp || !previous.timestamp) return false;
    return current.timestamp.toDate().toDateString() !== previous.timestamp.toDate().toDateString();
}

// ===== MESSAGE RENDERING =====
db.collection('messages')
    .orderBy('timestamp')
    .onSnapshot(snapshot => {
        const loading = document.getElementById('loading');
        if (loading) loading.remove();

        const messagesArea = document.getElementById('messagesArea');
        const wasAtBottom = messagesArea.scrollHeight - messagesArea.scrollTop <= messagesArea.clientHeight + 100;

        const currentIds = snapshot.docs.map(d => d.id);
        const idsChanged = JSON.stringify(currentIds) !== JSON.stringify(lastRenderedIds);

        if (idsChanged) {
            messagesArea.innerHTML = '';
            lastRenderedIds = currentIds;

            let prevMsg = null;
            snapshot.forEach(doc => {
                const msg = doc.data();

                if (shouldShowDateSeparator(msg, prevMsg)) {
                    const sep = document.createElement('div');
                    sep.className = 'date-separator';
                    sep.innerHTML = `<span>${getDateLabel(msg.timestamp)}</span>`;
                    messagesArea.appendChild(sep);
                }

                const div = createMessageElement(doc.id, msg);
                messagesArea.appendChild(div);
                prevMsg = msg;
            });
        } else {
            snapshot.forEach(doc => {
                const msg = doc.data();
                const existing = document.getElementById('msg-' + doc.id);
                if (existing) {
                    const updated = createMessageElement(doc.id, msg);
                    existing.replaceWith(updated);
                }
            });
        }

        if (wasAtBottom) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
    });

function createMessageElement(id, msg) {
    const div = document.createElement('div');
    div.id = 'msg-' + id;
    const isOwn = msg.sender === currentUser;
    div.classList.add('message', isOwn ? 'own' : 'other', msg.sender);

    const time = msg.timestamp
        ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '';

    // Swipe right to reply
    let startX = 0;
    let swiping = false;
    div.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        swiping = false;
    });
    div.addEventListener('touchmove', (e) => {
        const diff = e.touches[0].clientX - startX;
        if (diff > 10) {
            swiping = true;
            div.style.transform = `translateX(${Math.min(diff * 0.5, 80)}px)`;
            div.style.transition = 'none';
        }
    });
    div.addEventListener('touchend', () => {
        const currentTranslate = div.style.transform;
        div.style.transition = 'transform 0.2s ease';
        div.style.transform = '';
        if (swiping) {
            const match = currentTranslate.match(/translateX\((.+)px\)/);
            if (match && parseFloat(match[1]) > 50) {
                quickReply(id);
            }
        }
        swiping = false;
    });

    // Deleted messages
    if (msg.deleted) {
        const deletedBy = msg.deletedBy === 'hubby' ? 'Hubby' : 'Wifeyy';
        div.innerHTML = `
            <div class="deleted-msg">
                <span class="deleted-icon">&#128465;</span>
                This message was deleted by ${deletedBy}
            </div>
            <div class="message-meta">${msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy'} · ${time}</div>
        `;
        return div;
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

    // Reply preview in message
    let replyHtml = '';
    if (msg.replyTo) {
        const replyName = msg.replyTo.sender === 'hubby' ? 'Hubby' : 'Wifeyy';
        replyHtml = `
            <div class="msg-reply">
                <div class="msg-reply-name">${replyName}</div>
                <div class="msg-reply-text">${escapeHtml(msg.replyTo.text || (msg.replyTo.type === 'image' ? '📷 Photo' : msg.replyTo.type === 'audio' ? '🎤 Voice' : msg.replyTo.type === 'video' ? '🎬 Video' : '📎 File'))}</div>
            </div>
        `;
    }

    const editedLabel = msg.edited ? ' · <span class="edited-label">edited</span>' : '';

    let actionBtns = '';

    // Reply button - for all messages (WhatsApp-style arrow)
    actionBtns += `<button class="msg-reply-btn" onclick="event.stopPropagation(); quickReply('${id}')" title="Reply">↩️</button>`;

    // React button - for all messages
    actionBtns += `<button class="msg-react-btn" onclick="event.stopPropagation(); quickReact('${id}')" title="React">❤️</button>`;

    // Edit & Delete - only for own text messages
    if (isOwn) {
        if (msg.type === 'text' && msg.text) {
            actionBtns += `<button class="msg-edit-btn" onclick="event.stopPropagation(); openEditModal('${id}', '${escapeHtml(msg.text).replace(/'/g, "\\'")}')">✏️</button>`;
        }
        actionBtns += `<button class="msg-delete-btn" onclick="event.stopPropagation(); deleteMessage('${id}')">🗑️</button>`;
    }

    // Reactions
    let reactionsHtml = '';
    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        const reactionCounts = {};
        for (const [user, emoji] of Object.entries(msg.reactions)) {
            if (!reactionCounts[emoji]) reactionCounts[emoji] = { count: 0, byMe: false };
            reactionCounts[emoji].count++;
            if (user === currentUser) reactionCounts[emoji].byMe = true;
        }
        reactionsHtml = '<div class="msg-reactions">';
        for (const [emoji, data] of Object.entries(reactionCounts)) {
            reactionsHtml += `<button class="msg-reaction ${data.byMe ? 'reacted' : ''}" onclick="event.stopPropagation(); toggleReaction('${id}', '${emoji}')">${emoji} ${data.count > 1 ? data.count : ''}</button>`;
        }
        reactionsHtml += '</div>';
    }

    div.innerHTML = `
        <div class="message-row">
            ${mediaHtml}
            ${replyHtml}
            ${msg.text ? `<div class="message-text">${escapeHtml(msg.text)}</div>` : ''}
        </div>
        <div class="msg-actions">${actionBtns}</div>
        ${reactionsHtml}
        <div class="message-meta">${msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy'} · ${time}${editedLabel}</div>
    `;

    return div;
}

// ===== CONTEXT MENU =====
function showContextMenu(e, id, msg) {
    closeContextMenu();
    selectedMessageId = id;
    selectedMessageData = msg;

    const menu = document.getElementById('contextMenu');
    menu.style.display = 'block';

    let x, y;
    if (e.touches) {
        x = e.touches[0].clientX;
        y = e.touches[0].clientY;
    } else {
        x = e.clientX;
        y = e.clientY;
    }

    menu.style.left = Math.min(x, window.innerWidth - 160) + 'px';
    menu.style.top = Math.min(y, window.innerHeight - 120) + 'px';

    contextMenuTimeout = setTimeout(closeContextMenu, 3000);
}

function closeContextMenu() {
    document.getElementById('contextMenu').style.display = 'none';
    clearTimeout(contextMenuTimeout);
}

function copyMessageText() {
    if (!selectedMessageData || !selectedMessageData.text) {
        closeContextMenu();
        return;
    }
    navigator.clipboard.writeText(selectedMessageData.text).then(() => {
        showToast('Copied!');
    });
    closeContextMenu();
}

function startReply() {
    if (!selectedMessageData) return;
    replyingTo = {
        id: selectedMessageId,
        sender: selectedMessageData.sender,
        text: selectedMessageData.text || '',
        type: selectedMessageData.type || 'text',
        timestamp: selectedMessageData.timestamp
    };

    const preview = document.getElementById('replyPreview');
    document.getElementById('replyName').textContent = selectedMessageData.sender === 'hubby' ? 'Hubby' : 'Wifeyy';
    document.getElementById('replyText').textContent = selectedMessageData.text || (selectedMessageData.type === 'image' ? '📷 Photo' : selectedMessageData.type === 'audio' ? '🎤 Voice' : selectedMessageData.type === 'video' ? '🎬 Video' : '📎 File');
    preview.style.display = 'flex';

    document.getElementById('messageInput').focus();
    closeContextMenu();
}

function cancelReply() {
    replyingTo = null;
    document.getElementById('replyPreview').style.display = 'none';
}

// ===== REACTIONS =====
function showReactionPicker() {
    closeContextMenu();
    const picker = document.getElementById('reactionPicker');
    picker.style.display = 'flex';
    setTimeout(() => {
        document.addEventListener('click', closeReactionPicker, { once: true });
    }, 100);
}

function closeReactionPicker() {
    document.getElementById('reactionPicker').style.display = 'none';
}

function addReaction(emoji) {
    if (!selectedMessageId) return;
    toggleReaction(selectedMessageId, emoji);
    closeReactionPicker();
}

function submitQuickReaction(emoji) {
    if (selectedMessageId) {
        toggleReaction(selectedMessageId, emoji);
        closeReactionPicker();
    }
}

const emojiGridData = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','🥲','😋',
    '😛','😜','🤪','😝','🤑','🤗','🤭','🫢','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥','😏','😒','🙄',
    '😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🥵','🥶','😵','🤯','🥳','🥸','😎','🤓',
    '🧐','😕','🫤','😟','🙁','😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰','😥','😢','😭','😱','😖',
    '😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👹','👺','👻','👽',
    '👾','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎',
    '💔','❤️‍🔥','❤️‍🩹','💕','💞','💓','💗','💖','💘','💝','💟','🔥','⭐','🌟','💫','✨','🌈','☀️','🌤️','⛅',
    '👨','👩','🧑','👶','👧','👦','👨‍🦰','👩‍🦰','👨‍🦱','👩‍🦱','🧔','👵','👴','👫','👬','👭','💋','👋','🤚','🖐️',
    '👍','👎','👏','🙌','🤝','🙏','💪','🫶','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✊','👊'
];

function toggleEmojiGrid(e) {
    e.stopPropagation();
    const grid = document.getElementById('reactEmojiGrid');
    if (grid.style.display === 'none') {
        if (grid.children.length === 0) {
            emojiGridData.forEach(emoji => {
                const btn = document.createElement('button');
                btn.className = 'emoji-grid-btn';
                btn.textContent = emoji;
                btn.onclick = () => submitQuickReaction(emoji);
                grid.appendChild(btn);
            });
        }
        grid.style.display = 'grid';
    } else {
        grid.style.display = 'none';
    }
}

function toggleReaction(messageId, emoji) {
    const msgRef = db.collection('messages').doc(messageId);
    msgRef.get().then(doc => {
        const data = doc.data();
        const reactions = data.reactions || {};

        if (reactions[currentUser] === emoji) {
            delete reactions[currentUser];
        } else {
            reactions[currentUser] = emoji;
        }

        msgRef.update({ reactions: reactions });
    });
}

// ===== SEND MESSAGE =====
function sendMessage() {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();
    if (!text && !replyingTo) return;

    const msgData = {
        sender: currentUser,
        text: text,
        type: 'text',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyingTo) {
        msgData.replyTo = {
            sender: replyingTo.sender,
            text: replyingTo.text,
            type: replyingTo.type
        };
    }

    db.collection('messages').add(msgData);

    input.value = '';
    cancelReply();
    input.focus();
    setTyping(false);
}

document.getElementById('messageInput').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') sendMessage();
});

// Close pickers on outside click
document.addEventListener('click', (e) => {
    const emojiPicker = document.getElementById('emojiPicker');
    const emojiBtn = document.getElementById('emojiBtn');
    if (emojiPicker.style.display === 'block' && !emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.style.display = 'none';
    }
});

// ===== FILE UPLOAD =====
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
            progressFill.style.width = (e.loaded / e.total * 100) + '%';
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
        const MAX = 800;
        if (width > MAX || height > MAX) {
            if (width > height) { height = (height / width) * MAX; width = MAX; }
            else { width = (width / height) * MAX; height = MAX; }
        }
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);

        let compressed = canvas.toDataURL('image/jpeg', 0.7);
        if (compressed.length > 640000) compressed = canvas.toDataURL('image/jpeg', 0.4);

        progressFill.style.width = '90%';
        progressText.textContent = 'Sending...';
        saveToFirestore('image', compressed, fileName, compressed.length, progressEl, progressFill, progressText);
    };
    img.src = dataUrl;
}

function saveToFirestore(type, fileData, fileName, fileSize, progressEl, progressFill, progressText) {
    progressFill.style.width = '90%';
    progressText.textContent = 'Sending...';

    const msgData = {
        sender: currentUser,
        text: '',
        type: type,
        fileData: fileData,
        fileName: fileName,
        fileSize: formatFileSize(fileSize),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyingTo) {
        msgData.replyTo = {
            sender: replyingTo.sender,
            text: replyingTo.text,
            type: replyingTo.type
        };
    }

    db.collection('messages').add(msgData).then(() => {
        progressEl.style.display = 'none';
        cancelReply();
    }).catch(err => {
        progressEl.style.display = 'none';
        if (err.message.includes('maximum size')) alert('File is too large. Try a smaller file.');
        else alert('Failed to send: ' + err.message);
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
        mp3: '\uD83C\uDFB5', wav: '\uD83C\uDFB5', ogg: '\uD83C\uDFB5', m4a: '\uD83C\uDFB5',
        mp4: '\uD83C\uDFAC', mov: '\uD83C\uDFAC', avi: '\uD83C\uDFAC', mkv: '\uD83C\uDFAC',
        jpg: '\uD83D\uDDBC\uFE0F', jpeg: '\uD83D\uDDBC\uFE0F', png: '\uD83D\uDDBC\uFE0F', gif: '\uD83D\uDDBC\uFE0F', webp: '\uD83D\uDDBC\uFE0F'
    };
    return icons[ext] || '\uD83D\uDCC1';
}

// ===== VOICE RECORDING =====
function startRecording() {
    if (isRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Voice recording not supported.');
        return;
    }

    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        isRecording = true;
        audioChunks = [];

        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus'
            : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');

        mediaRecorder = new MediaRecorder(stream, { mimeType });
        mediaRecorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunks.push(e.data); };

        mediaRecorder.onstop = () => {
            isRecording = false;
            stream.getTracks().forEach(t => t.stop());
            document.getElementById('micBtn').classList.remove('recording');
            document.getElementById('recordingIndicator').style.display = 'none';
            if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
            if (audioChunks.length === 0) return;

            const audioBlob = new Blob(audioChunks, { type: mimeType });
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

        mediaRecorder.onerror = () => {
            isRecording = false;
            stream.getTracks().forEach(t => t.stop());
            document.getElementById('micBtn').classList.remove('recording');
            document.getElementById('recordingIndicator').style.display = 'none';
            if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
            alert('Recording failed.');
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
    }).catch(() => alert('Microphone access denied.'));
}

function stopRecording(e) {
    if (e) e.preventDefault();
    if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
}

document.getElementById('micBtn').addEventListener('contextmenu', e => e.preventDefault());

// ===== LIGHTBOX =====
function openLightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.onclick = () => lb.remove();
    const img = document.createElement('img');
    img.src = url;
    lb.appendChild(img);
    document.body.appendChild(lb);
}

// ===== TOAST =====
function showToast(text) {
    const toast = document.getElementById('toast');
    toast.textContent = text;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 1500);
}

// ===== QUICK ACTIONS (Button-based) =====
function copyMsgText(id) {
    const el = document.getElementById('msg-' + id);
    if (!el) return;
    const textEl = el.querySelector('.message-text');
    if (textEl) {
        navigator.clipboard.writeText(textEl.textContent).then(() => showToast('Copied!'));
    }
}

function quickReply(id) {
    const msgRef = db.collection('messages').doc(id);
    msgRef.get().then(doc => {
        const msg = doc.data();
        replyingTo = {
            id: id,
            sender: msg.sender,
            text: msg.text || '',
            type: msg.type || 'text'
        };
        const preview = document.getElementById('replyPreview');
        document.getElementById('replyName').textContent = msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy';
        document.getElementById('replyText').textContent = msg.text || (msg.type === 'image' ? '📷 Photo' : msg.type === 'audio' ? '🎤 Voice' : msg.type === 'video' ? '🎬 Video' : '📎 File');
        preview.style.display = 'flex';
        document.getElementById('messageInput').focus();
    });
}

function quickReact(id) {
    selectedMessageId = id;
    const picker = document.getElementById('reactionPicker');
    const grid = document.getElementById('reactEmojiGrid');
    grid.style.display = 'none';
    picker.style.display = 'flex';

    const msgEl = document.getElementById('msg-' + id);
    if (msgEl) {
        const rect = msgEl.getBoundingClientRect();
        picker.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
        picker.style.left = '50%';
    }

    const closeHandler = (e) => {
        if (!picker.contains(e.target) && !e.target.closest('.msg-react-btn')) {
            closeReactionPicker();
            document.removeEventListener('click', closeHandler);
        }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 100);
}

// ===== UTILS =====
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
    db.collection('messages').doc(editingMessageId).update({ text: newText, edited: true });
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
        deleted: true, deletedBy: currentUser, text: '', fileData: null, fileName: null, fileSize: null, type: 'deleted'
    });
    closeConfirm();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== INIT =====
initEmojiPicker();
initTyping();
watchTyping();
