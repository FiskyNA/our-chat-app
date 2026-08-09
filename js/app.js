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

if (!currentUser) {
    window.location.href = 'index.html';
}

// Load dark mode
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    document.getElementById('themeBtn').innerHTML = '&#9728;';
}

document.getElementById('currentUser').textContent = currentName;
document.getElementById('headerAvatar').innerHTML = currentUser === 'hubby' ? '&#128104;' : '&#128105;';

// ===== MIC/SEND TOGGLE =====
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const micBtn = document.getElementById('micBtn');

function toggleMicSend() {
    if (messageInput.value.trim()) {
        sendBtn.classList.add('visible');
        micBtn.style.display = 'none';
    } else {
        sendBtn.classList.remove('visible');
        micBtn.style.display = 'flex';
    }
}

messageInput.addEventListener('input', toggleMicSend);
messageInput.addEventListener('input', () => {
    setTyping(true);
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => setTyping(false), 2000);
});
const emojis = [
    '😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃',
    '😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙',
    '🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🫢',
    '🫣','🤫','🤔','🫡','🤐','🤨','😐','😑','😶','🫥',
    '😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴',
    '😷','🤒','🤕','🤢','🤮','🥵','🥶','🥴','😵','🤯',
    '🤠','🥳','🥸','😎','🤓','🧐','😕','🫤','😟','🙁',
    '😮','😯','😲','😳','🥺','🥹','😦','😧','😨','😰',
    '😥','😢','😭','😱','😖','😣','😞','😓','😩','😫',
    '🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩',
    '🤡','👹','👺','👻','👽','👾','🤖','😺','😸','😹',
    '😻','😼','😽','🙀','😿','😾','❤️','🧡','💛','💚',
    '💙','💜','🖤','🤍','🤎','💔','❤️‍🔥','❤️‍🩹','❣️','💕',
    '💞','💓','💗','💖','💘','💝','💟','👍','👎','👊',
    '✊','🤛','🤜','👏','🙌','👐','🤲','🤝','🙏','✌️',
    '🤞','🫰','🤟','🤘','👌','🤌','🤏','👈','👉','👆',
    '🖕','👇','☝️','🫵','💪','🦾','🦿','🦵','🦶','👂',
    '🦻','👃','🧠','🫀','🫁','🦷','🦴','👀','👁️','👅',
    '👄','💋','🩸','💧','💦','🫧','💨','🫠','🎉','🎊',
    '🎈','🎀','🎁','🎂','🍰','🧁','🍩','🍪','🍫','🍬',
    '🍭','🍮','🍯','🍼','🥛','☕','🫖','🍵','🍶','🍾',
    '🍷','🍸','🍹','🍺','🍻','🥂','🥃','🫗','🥤','🧋',
    '🧃','🧊','🥢','🍽️','🍴','🥄','🔪','🫙','🏺','🌍',
    '🌎','🌏','🗺️','🏔️','⛰️','🌋','🗻','🏕️','🏖️','🏜️',
    '🏝️','🏞️','🏟️','🏛️','🏗️','🧱','🪨','🪵','🛖','🏠',
    '🏡','🏢','🏣','🏤','🏥','🏦','🏨','🏩','🏪','🏫',
    '🏬','🏭','🏯','🏰','💒','🗼','🗽','⛪','🕌','🛕',
    '🕍','⛩️','🕋','⛲','⛺','🌁','🌃','🏙️','🌄','🌅',
    '🌆','🌇','🌉','♨️','🎠','🛝','🎡','🎢','💈','🎪',
    '🚂','🚃','🚄','🚅','🚆','🚇','🚈','🚉','🚊','🚝',
    '🚞','🚋','🚌','🚍','🚎','🚐','🚑','🚒','🚓','🚔',
    '🚕','🚖','🚗','🚘','🚙','🛻','🚚','🚛','🚜','🏎️',
    '🏍️','🛵','🦽','🦼','🛺','🚲','🛴','🛹','🛼','🚏',
    '🛣️','🛤️','🛞','⛽','🛞','🚨','🚥','🚦','🛑','🚧',
    '⚓','🛟','⛵','🛶','🚤','🛳️','⛴️','🛥️','🚢','✈️',
    '🛩️','🛫','🛬','🪂','💺','🚁','🚟','🚠','🚡','🛰️',
    '🚀','🛸','🌍','🌎','🌏','🌕','🌖','🌗','🌘','🌑',
    '🌒','🌓','🌔','🌙','🌚','🌛','🌜','🌡️','☀️','🌝',
    '🌞','🪐','⭐','🌟','🌠','🌌','☁️','⛅','⛈️','🌤️',
    '🌥️','🌦️','🌧️','🌨️','🌩️','🌪️','🌫️','🌬️','🌀','🌈',
    '🌂','☂️','☔','⛱️','⚡','❄️','☃️','⛄','☄️','🔥',
    '💧','🌊','🎃','🎄','🎆','🎇','🧨','✨','🎈','🎉',
    '🎊','🎋','🎍','🎎','🎏','🎐','🎑','🧧','🎀','🎁',
    '🎗️','🎟️','🎫','🎖️','🏆','🏅','🥇','🥈','🥉','⚽',
    '⚾','🥎','🏀','🏐','🏈','🏉','🎾','🥏','🎳','🏏',
    '🏑','🏒','🥍','🏓','🏸','🥊','🥋','🥅','⛳','⛸️',
    '🎣','🤿','🎿','🛷','🥌','🎯','🪀','🪁','🎱','🔮',
    '🪄','🧿','🎮','🕹️','🎰','🎲','🧩','🧸','🪅','🪩',
    '🪆','♠️','♥️','♦️','♣️','♟️','🃏','🀄','🎴','🎭',
    '🖼️','🎨','🧵','🪡','🧶','🪢','👓','🕶️','🥽','🥼',
    '🦺','👔','👕','👖','🧣','🧤','🧥','🧦','👗','👘',
    '🥻','🩱','🩲','🩳','👙','👚','🪭','👛','👜','👝',
    '🧳',' heels','👡','🥿','👢','👞','👟','🥾','🥿','🛹',
    '🛼','🪷','🌺','🌻','🌹','🌷','🌸','💐','🌾','🌿',
    '☘️','🍀','🍁','🍂','🍃','🪹','🪺','🍄','🌰','🦩',
    '🦜','🦚','🦤','🦢','🦩','🕊️','🐇','🦝','🦨','🦡',
    '🦫','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲',
    '🦕','🦖','🐳','🐋','🐬','🦭','🐟','🐠','🐡','🦈',
    '🐙','🐚','🪸','🪼','🦀','🦞','🦐','🦑','🦦','🦥',
    '🐝','🪲','🐞','🦗','🪳','🦟','🦠','🪱','🦟','🦠',
    '🐌','🦋','🐛','🐜','🪰','🪱','🪲','🪳','🦟','🦗',
    '🕷️','🦂','🐢','🐍','🦎','🦂','🦖','🦕','🐙','🦑',
    '🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈',
    '🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦣','🦏','🦛',
    '🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖',
    '🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈',
    '🐈‍⬛','🪶','🐓','🦃','🦤','🦚','🦜','🦢','🦩','🕊️',
    '🐇','🦝','🦨','🦡','🦫','🦦','🦥','🐁','🐀','🐿️',
    '🦔','🫎','🫏'
];

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
    closeReactionPicker();
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// ===== TYPING INDICATOR =====




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
            indicator.style.display = 'block';
        } else {
            indicator.textContent = '';
            indicator.style.display = 'none';
        }
    });
}

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

        // Mark received messages as read (blue ticks)
        markMessagesAsRead();

        // Show notification for new messages from other user
        if (idsChanged && snapshot.docs.length > 0) {
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            const lastMsg = lastDoc.data();
            if (lastMsg.sender === otherUser && !document.hidden) {
                // Only notify if user scrolled up (not at bottom)
                if (!wasAtBottom) {
                    const senderName = lastMsg.sender === 'hubby' ? 'Hubby' : 'Wifeyy';
                    showNotification(senderName, lastMsg.text || '📎 Attachment');
                }
            }
        }
    });

function markMessagesAsRead() {
    db.collection('messages')
        .where('sender', '==', otherUser)
        .where('read', '==', false)
        .get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });
            if (!snapshot.empty) batch.commit();
        })
        .catch(() => {});
}

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
    let replyIndicator = null;

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

            // Show reply indicator
            if (!replyIndicator) {
                replyIndicator = document.createElement('div');
                replyIndicator.className = 'swipe-reply-indicator';
                replyIndicator.innerHTML = '&#8618;';
                div.prepend(replyIndicator);
            }
            const opacity = Math.min((diff - 10) / 60, 1);
            replyIndicator.style.opacity = opacity;
        }
    });

    div.addEventListener('touchend', () => {
        const currentTranslate = div.style.transform;
        div.style.transition = 'transform 0.2s ease';
        div.style.transform = '';

        // Remove reply indicator
        if (replyIndicator) {
            replyIndicator.remove();
            replyIndicator = null;
        }

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
        const replyToId = msg.replyTo.id || '';
        replyHtml = `
            <div class="msg-reply" data-reply-to="${replyToId}" onclick="scrollToMessage('${replyToId}')">
                <div class="msg-reply-name">${replyName}</div>
                <div class="msg-reply-text">${escapeHtml(msg.replyTo.text || (msg.replyTo.type === 'image' ? '📷 Photo' : msg.replyTo.type === 'audio' ? '🎤 Voice' : msg.replyTo.type === 'video' ? '🎬 Video' : '📎 File'))}</div>
            </div>
        `;
    }

    const editedLabel = msg.edited ? ' · <span class="edited-label">edited</span>' : '';
    const readTick = isOwn ? (msg.read ? '<span class="tick read">✓✓</span>' : '<span class="tick">✓✓</span>') : '';
    const pinnedLabel = msg.pinned ? ' · <span class="pinned-label">📌 pinned</span>' : '';

    let menuItems = '';
    menuItems += `<button class="dropdown-item" onclick="event.stopPropagation(); quickReply('${id}')">↩️ Reply</button>`;
    menuItems += `<button class="dropdown-item" onclick="event.stopPropagation(); quickReact('${id}')">❤️ React</button>`;
    if (msg.text) {
        menuItems += `<button class="dropdown-item" onclick="event.stopPropagation(); copyMsgText('${id}')">📋 Copy</button>`;
    }
    if (isOwn && msg.type === 'text' && msg.text) {
        menuItems += `<button class="dropdown-item" onclick="event.stopPropagation(); openEditModal('${id}', '${escapeHtml(msg.text).replace(/'/g, "\\'")}')">✏️ Edit</button>`;
    }
    if (isOwn) {
        menuItems += `<button class="dropdown-item dropdown-delete" onclick="event.stopPropagation(); deleteMessage('${id}')">🗑️ Delete</button>`;
    }

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
        ${replyHtml}
        <div class="message-row">
            ${mediaHtml}
            ${msg.text ? `<div class="message-text" data-full="${escapeHtml(msg.text).replace(/"/g, '&quot;')}">${formatText(msg.text)}</div>` : ''}
        </div>
        <div class="link-preview-container"></div>
        ${msg.text && msg.text.length > 150 ? '<button class="read-more-btn" onclick="toggleReadMore(this)">Read more...</button>' : ''}
        ${reactionsHtml}
        <div class="message-footer">
            <div class="message-meta">${msg.sender === 'hubby' ? 'Hubby' : 'Wifeyy'} · ${time}${readTick}${editedLabel}</div>
            <div class="msg-dropdown-wrap">
                <button class="msg-dropdown-btn" onclick="event.stopPropagation(); toggleDropdown(this)">⋮</button>
                <div class="msg-dropdown">${menuItems}</div>
            </div>
        </div>
    `;

    // Add link preview if message contains a URL
    if (msg.text && !isOwn) {
        const url = extractUrl(msg.text);
        if (url) {
            const container = div.querySelector('.link-preview-container');
            container.appendChild(createLinkPreview(url));
        }
    }

    return div;
}

function cancelReply() {
    replyingTo = null;
    document.getElementById('replyPreview').style.display = 'none';
}

// ===== REACTIONS =====

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
        read: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyingTo) {
        msgData.replyTo = {
            id: replyingTo.id,
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
    toggleMicSend();
    autoResize(input);
}

// Textarea: Enter sends, Shift+Enter new line
document.getElementById('messageInput').addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
    }
});

// Auto-resize textarea
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

document.getElementById('messageInput').addEventListener('input', function() {
    autoResize(this);
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
        read: false,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (replyingTo) {
        msgData.replyTo = {
            id: replyingTo.id,
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

// ===== SCROLL TO MESSAGE =====
function scrollToMessage(msgId) {
    if (!msgId) return;
    const el = document.getElementById('msg-' + msgId);
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight-message');
        setTimeout(() => el.classList.remove('highlight-message'), 2000);
    }
}

// ===== UTILS =====
function switchUser() {
    localStorage.removeItem('chatUser');
    window.location.href = 'index.html';
}

function toggleDropdown(btn) {
    const dropdown = btn.nextElementSibling;
    const allDropdowns = document.querySelectorAll('.msg-dropdown');
    allDropdowns.forEach(d => { if (d !== dropdown) d.style.display = 'none'; });
    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
}

document.addEventListener('click', () => {
    document.querySelectorAll('.msg-dropdown').forEach(d => d.style.display = 'none');
});

function toggleReadMore(btn) {
    const textEl = btn.previousElementSibling.querySelector('.message-text');
    if (btn.textContent === 'Read more...') {
        textEl.classList.add('expanded');
        btn.textContent = 'Read less';
    } else {
        textEl.classList.remove('expanded');
        btn.textContent = 'Read more...';
    }
}

// ===== LINK PREVIEW =====
function extractUrl(text) {
    const regex = /(https?:\/\/[^\s]+)/gi;
    const match = text.match(regex);
    return match ? match[0] : null;
}

function createLinkPreview(url) {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-preview';
    wrapper.innerHTML = `<div class="link-preview-loading">Loading preview...</div>`;

    fetch(`https://api.linkpreview.net/?q=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error();
            wrapper.innerHTML = `
                <a href="${escapeHtml(url)}" target="_blank" class="link-preview-card">
                    ${data.image ? `<img src="${escapeHtml(data.image)}" class="link-preview-img" onerror="this.style.display='none'">` : ''}
                    <div class="link-preview-info">
                        <div class="link-preview-site">${escapeHtml(data.provider || new URL(url).hostname)}</div>
                        <div class="link-preview-title">${escapeHtml(data.title || '')}</div>
                        <div class="link-preview-desc">${escapeHtml(data.description || '')}</div>
                    </div>
                </a>
            `;
        })
        .catch(() => {
            wrapper.innerHTML = `
                <a href="${escapeHtml(url)}" target="_blank" class="link-preview-card link-preview-fallback">
                    <div class="link-preview-info">
                        <div class="link-preview-site">${escapeHtml(new URL(url).hostname)}</div>
                        <div class="link-preview-title">${escapeHtml(url)}</div>
                    </div>
                </a>
            `;
        });

    return wrapper;
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

function formatText(text) {
    let formatted = escapeHtml(text);
    // Bold: *text*
    formatted = formatted.replace(/\*(.+?)\*/g, '<strong>$1</strong>');
    // Italic: _text_
    formatted = formatted.replace(/_(.+?)_/g, '<em>$1</em>');
    // Strikethrough: ~text~
    formatted = formatted.replace(/~(.+?)~/g, '<del>$1</del>');
    // Inline code: `text`
    formatted = formatted.replace(/`(.+?)`/g, '<code>$1</code>');
    return formatted;
}

// ===== NOTIFICATIONS =====
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            new Notification(title, {
                body: body,
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>'
            });
        } catch (e) {}
    }
}

// ===== INIT =====
initEmojiPicker();
initTyping();
watchTyping();
requestNotificationPermission();

// ===== SEARCH =====
function toggleSearch() {
    const bar = document.getElementById('searchBar');
    const isOpen = bar.style.display !== 'none';
    bar.style.display = isOpen ? 'none' : 'flex';
    if (!isOpen) {
        document.getElementById('searchInput').focus();
    } else {
        document.getElementById('searchInput').value = '';
        clearSearch();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const query = searchInput.value.trim().toLowerCase();
            const messages = document.querySelectorAll('.message');
            messages.forEach(msg => {
                const textEl = msg.querySelector('.message-text');
                if (!textEl) return;
                if (!query) {
                    msg.style.display = '';
                    textEl.innerHTML = formatText(textEl.dataset.original || textEl.textContent);
                    return;
                }
                if (!textEl.dataset.original) {
                    textEl.dataset.original = textEl.textContent;
                }
                const text = textEl.dataset.original.toLowerCase();
                if (text.includes(query)) {
                    msg.style.display = '';
                    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                    textEl.innerHTML = formatText(textEl.dataset.original).replace(regex, '<mark>$1</mark>');
                } else {
                    msg.style.display = 'none';
                }
            });
        });
    }
});

function clearSearch() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
        msg.style.display = '';
        const textEl = msg.querySelector('.message-text');
        if (textEl && textEl.dataset.original) {
            textEl.innerHTML = formatText(textEl.dataset.original);
        }
    });
}
