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
let lastRenderedHashes = {};
let firstLoad = true;
let newMessagesDividerId = null;
let selectedMessageId = null;
let selectedMessageData = null;
let replyingTo = null;
let typingTimeout = null;
const linkPreviewCache = new Map();
let reactionCloseHandler = null;

if (!currentUser) {
    window.location.href = 'index.html';
}

// Load dark mode
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    document.getElementById('themeBtn').innerHTML = '&#9728;';
}

document.getElementById('currentUser').textContent = otherName;
document.getElementById('headerAvatar').innerHTML = currentUser === 'hubby' ? '&#128105;' : '&#128104;';

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
        btn.setAttribute('data-name', getEmojiName(emoji));
        btn.onclick = () => insertEmoji(emoji);
        grid.appendChild(btn);
    });

    document.getElementById('emojiSearch').addEventListener('input', filterEmojis);
}

function getEmojiName(emoji) {
    const names = {
        '😀': 'smile', '😃': 'smile', '😄': 'smile', '😁': 'grin', '😆': 'laugh',
        '😅': 'sweat', '🤣': 'rofl', '😂': 'joy', '🙂': 'slight smile', '🙃': 'upside down',
        '😉': 'wink', '😊': 'blush', '😇': 'innocent', '🥰': 'love', '😍': 'heart eyes',
        '🤩': 'starstruck', '😘': 'kiss', '😗': 'kiss', '😚': 'kiss', '😙': 'kiss',
        '🥲': 'tearful', '😋': 'yummy', '😛': 'tongue', '😜': 'wink tongue', '🤪': 'zany',
        '😝': 'squint tongue', '🤑': 'money', '🤗': 'hug', '🤭': 'oops', '🤫': 'shh',
        '🤔': 'thinking', '🤐': 'zipper', '🤨': 'raised eyebrow', '😐': 'neutral',
        '😑': 'expressionless', '😶': 'no mouth', '😏': 'smirk', '😒': 'unamused',
        '🙄': 'eye roll', '😬': 'grimace', '🤥': 'lying', '😌': 'relieved',
        '😔': 'pensive', '😪': 'sleepy', '🤤': 'drool', '😴': 'sleeping',
        '😷': 'mask', '🤒': 'thermometer', '🤕': 'bandage', '🤢': 'nauseous',
        '🤮': 'vomiting', '🥵': 'hot', '🥶': 'cold', '🥴': 'woozy', '😵': 'dizzy',
        '🤯': 'mind blown', '🤠': 'cowboy', '🥳': 'party', '😎': 'cool',
        '🤓': 'nerd', '🧐': 'monocle', '😕': 'confused', '😟': 'worried',
        '🙁': 'slightly sad', '😮': 'open mouth', '😯': 'hushed', '😲': 'astonished',
        '😳': 'flushed', '🥺': 'pleading', '😦': 'frown open', '😧': 'anguished',
        '😨': 'fearful', '😰': 'anxious', '😥': 'sad relieved', '😢': 'cry',
        '😭': 'sob', '😱': 'scream', '😖': 'confounded', '😣': 'persevere',
        '😞': 'disappointed', '😓': 'down sweat', '😩': 'weary', '😫': 'tired',
        '🥱': 'yawn', '😤': 'triumph', '😡': 'angry', '😠': 'angry',
        '🤬': 'swearing', '😈': 'devil', '👿': 'angry devil', '💀': 'skull',
        '💩': 'poop', '🤡': 'clown', '👹': 'ogre', '👺': 'goblin',
        '👻': 'ghost', '👽': 'alien', '👾': 'alien monster', '🤖': 'robot',
        '❤️': 'heart', '🧡': 'orange heart', '💛': 'yellow heart', '💚': 'green heart',
        '💙': 'blue heart', '💜': 'purple heart', '🖤': 'black heart', '🤍': 'white heart',
        '💔': 'broken heart', '❣️': 'heart exclamation', '💕': 'two hearts',
        '💞': 'revolving hearts', '💓': 'heartbeat', '💗': 'growing heart',
        '💖': 'sparkling heart', '💘': 'heart arrow', '💝': 'gift heart',
        '👍': 'thumbs up', '👎': 'thumbs down', '👏': 'clap', '🙌': 'raised hands',
        '🤝': 'handshake', '🙏': 'pray', '✌️': 'peace', '🤞': 'crossed fingers',
        '🤟': 'love you', '🤘': 'rock on', '👌': 'ok', '👈': 'point left',
        '👉': 'point right', '👆': 'point up', '👇': 'point down', '💪': 'muscle',
        '🔥': 'fire', '⭐': 'star', '🌟': 'glowing star', '✨': 'sparkles',
        '🎉': 'party', '🎊': 'confetti', '🎈': 'balloon', '🎁': 'gift',
        '🎂': 'cake', '🍰': 'cake', '🍩': 'donut', '🍪': 'cookie',
        '🍫': 'chocolate', '🍬': 'candy', '☕': 'coffee', '🍺': 'beer',
        '🥂': 'cheers', '🍷': 'wine', '🍕': 'pizza', '🍔': 'burger',
        '🍟': 'fries', '🌮': 'taco', '🍣': 'sushi', '🍦': 'ice cream',
        '🌈': 'rainbow', '☀️': 'sun', '🌙': 'moon', '⭐': 'star',
        '🌸': 'cherry blossom', '🌺': 'hibiscus', '🌻': 'sunflower', '🌹': 'rose',
        '🎵': 'music', '🎶': 'notes', '📸': 'camera', '💻': 'laptop',
        '📱': 'phone', '💌': 'love letter', '📝': 'memo', '✏️': 'pencil',
        '💎': 'gem', '🏆': 'trophy', '⚽': 'soccer', '🏀': 'basketball',
        '🎮': 'video game', '🕹️': 'joystick', '🧩': 'puzzle', '🧸': 'teddy bear',
        '👶': 'baby', '👧': 'girl', '👦': 'boy', '👨': 'man', '👩': 'woman',
        '🧓': 'older person', '👴': 'old man', '👵': 'old woman',
        '🐶': 'dog', '🐱': 'cat', '🐭': 'mouse', '🐹': 'hamster',
        '🐰': 'rabbit', '🦊': 'fox', '🐻': 'bear', '🐼': 'panda',
        '🐨': 'koala', '🐯': 'tiger', '🦁': 'lion', '🐮': 'cow',
        '🐷': 'pig', '🐸': 'frog', '🐵': 'monkey', '🙈': 'see no evil',
        '🙉': 'hear no evil', '🙊': 'speak no evil', '🐔': 'chicken',
        '🐧': 'penguin', '🐦': 'bird', '🐤': 'baby chick', '🦆': 'duck',
        '🦅': 'eagle', '🦉': 'owl', '🦇': 'bat', '🐺': 'wolf',
        '🐗': 'boar', '🐴': 'horse', '🦄': 'unicorn', '🐝': 'bee',
        '🐛': 'bug', '🦋': 'butterfly', '🐌': 'snail', '🐞': 'ladybug',
        '🐜': 'ant', '🪲': 'beetle', '🐢': 'turtle', '🐍': 'snake',
        '🦎': 'lizard', '🐙': 'octopus', '🦑': 'squid', '🦐': 'shrimp',
        '🦀': 'crab', '🐠': 'tropical fish', '🐟': 'fish', '🐡': 'blowfish',
        '🐬': 'dolphin', '🐳': 'whale', '🐋': 'whale', '🦈': 'shark',
        '🐊': 'crocodile', '🐅': 'tiger', '🐆': 'leopard', '🦓': 'zebra',
        '🦍': 'gorilla', '🐘': 'elephant', '🦛': 'hippo', '🐪': 'camel',
        '🦒': 'giraffe', '🐃': 'water buffalo', '🐂': 'ox', '🐄': 'cow',
        '🐎': 'horse', '🐑': 'sheep', '🦙': 'llama', '🐐': 'goat',
        ' deer': 'deer', '🐕': 'dog', '🐩': 'poodle', '🐈': 'cat'
    };
    return names[emoji] || 'emoji';
}

function filterEmojis() {
    const query = document.getElementById('emojiSearch').value.toLowerCase().trim();
    const items = document.querySelectorAll('#emojiGrid .emoji-item');
    items.forEach(item => {
        const name = item.getAttribute('data-name') || '';
        item.style.display = (!query || name.includes(query)) ? '' : 'none';
    });
}

let emojiPickerInit = false;

function toggleEmojiPicker() {
    const picker = document.getElementById('emojiPicker');
    const search = document.getElementById('emojiSearch');
    if (picker.style.display === 'none') {
        if (!emojiPickerInit) {
            initEmojiPicker();
            emojiPickerInit = true;
        }
        picker.style.display = 'block';
        search.value = '';
        filterEmojis();
        setTimeout(() => search.focus(), 100);
    } else {
        picker.style.display = 'none';
    }
    closeReactionPicker();
}

function insertEmoji(emoji) {
    const input = document.getElementById('messageInput');
    input.value += emoji;
    input.focus();
}

// ===== TYPING INDICATOR =====
let typingRef = null;
let typingReceiverTimeout = null;
let otherTypingState = false;

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
        otherPresenceData = data;
        const indicator = document.getElementById('typingIndicator');
        const isTyping = data && data.typing;

        updateHeaderStatus(data);

        if (isTyping && !otherTypingState) {
            otherTypingState = true;
            indicator.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div><span>${otherName} is typing</span>`;
            indicator.style.display = 'flex';
        } else if (!isTyping && otherTypingState) {
            otherTypingState = false;
            indicator.innerHTML = '';
            indicator.style.display = 'none';
        }

        clearTimeout(typingReceiverTimeout);
        if (isTyping) {
            typingReceiverTimeout = setTimeout(() => {
                otherTypingState = false;
                indicator.innerHTML = '';
                indicator.style.display = 'none';
            }, 8000);
        }
    });
}

// ===== LAST SEEN =====
let otherPresenceData = null;

function updateLastSeen() {
    if (typingRef) {
        typingRef.set({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
            frozen: false
        }, { merge: true });
    }
}

function updateLastMessageTime() {
    if (!typingRef) return;
    const hour = new Date().getHours();
    const isSneakyHours = hour >= 22 || hour < 4;
    typingRef.set({
        lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
        ...(isSneakyHours && { frozen: true })
    }, { merge: true });
}

function getSneakyTimestamp(data) {
    if (data.frozen && data.lastMessageTime) {
        return data.lastMessageTime;
    }
    return data.lastSeen;
}

// Only update lastSeen when tab is visible — so "online" is accurate
setInterval(() => {
    if (!document.hidden) updateLastSeen();
}, 30000);

document.addEventListener('visibilitychange', () => {
    updateLastSeen();
    if (!document.hidden) setFaviconBadge(0);
});
window.addEventListener('beforeunload', updateLastSeen);

// Refresh header status every 60s so "online" transitions to "last seen"
setInterval(() => {
    if (otherPresenceData) updateHeaderStatus(otherPresenceData);
}, 60000);

function formatLastSeen(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 60) return 'online';

    const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) return 'last seen today at ' + timeStr;
    if (isYesterday) return 'last seen yesterday at ' + timeStr;
    const dateStr = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return 'last seen ' + dateStr + ' at ' + timeStr;
}

function updateHeaderStatus(data) {
    const statusEl = document.getElementById('headerStatus');
    if (!statusEl) return;

    if (data && data.typing && !data.frozen) {
        statusEl.textContent = 'online';
        return;
    }

    const displayTimestamp = getSneakyTimestamp(data);
    if (displayTimestamp) {
        statusEl.textContent = formatLastSeen(displayTimestamp);
    }
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

        // Remove deleted messages
        lastRenderedIds.forEach(id => {
            if (!currentIds.includes(id)) {
                const el = document.getElementById('msg-' + id);
                if (el) {
                    const prev = el.previousElementSibling;
                    el.remove();
                    if (prev && prev.classList.contains('date-separator')) prev.remove();
                }
                delete lastRenderedHashes[id];
            }
        });

        // Update existing messages only if data changed
        snapshot.forEach(doc => {
            const msg = doc.data();
            const existing = document.getElementById('msg-' + doc.id);
            if (existing) {
                const hash = JSON.stringify({
                    text: msg.text, reactions: msg.reactions, read: msg.read,
                    deleted: msg.deleted, pinned: msg.pinned, edited: msg.edited,
                    fileData: msg.fileData, type: msg.type
                });
                if (lastRenderedHashes[doc.id] !== hash) {
                    const updated = createMessageElement(doc.id, msg);
                    existing.replaceWith(updated);
                    lastRenderedHashes[doc.id] = hash;
                }
            }
        });

        // Add new messages
        const newIds = currentIds.filter(id => !lastRenderedIds.includes(id));
        newIds.forEach(id => {
            const doc = snapshot.docs.find(d => d.id === id);
            if (!doc) return;
            const msg = doc.data();

            // Find insertion point
            const idx = currentIds.indexOf(id);
            let insertBefore = null;
            for (let i = idx + 1; i < currentIds.length; i++) {
                const next = document.getElementById('msg-' + currentIds[i]);
                if (next) { insertBefore = next; break; }
            }

            // Date separator
            let prevMsg = null;
            if (idx > 0) {
                const prevId = currentIds[idx - 1];
                const prevEl = document.getElementById('msg-' + prevId);
                if (prevEl) {
                    const prevDoc = snapshot.docs.find(d => d.id === prevId);
                    if (prevDoc) prevMsg = prevDoc.data();
                }
            }
            if (shouldShowDateSeparator(msg, prevMsg)) {
                const sep = document.createElement('div');
                sep.className = 'date-separator';
                sep.innerHTML = `<span>${getDateLabel(msg.timestamp)}</span>`;
                messagesArea.insertBefore(sep, insertBefore);
            }

            const div = createMessageElement(id, msg);
            messagesArea.insertBefore(div, insertBefore);
            lastRenderedHashes[id] = JSON.stringify({
                text: msg.text, reactions: msg.reactions, read: msg.read,
                deleted: msg.deleted, pinned: msg.pinned, edited: msg.edited,
                fileData: msg.fileData, type: msg.type,
                timestamp: msg.timestamp?.toMillis?.() || null
            });
        });

        lastRenderedIds = currentIds;

        // Insert "New Messages" divider on first load
        if (firstLoad) {
            firstLoad = false;
            insertNewMessagesDivider(snapshot, messagesArea);
        }

        if (wasAtBottom) {
            messagesArea.scrollTop = messagesArea.scrollHeight;
            document.getElementById('scrollBottomBtn').style.display = 'none';
        }

        // Mark received messages as read
        markMessagesAsRead(snapshot);

        // Show notification for new messages from other user (hubby only)
        if (currentUser === 'hubby' && newIds.length > 0 && !firstLoad) {
            newIds.forEach(id => {
                const doc = snapshot.docs.find(d => d.id === id);
                if (doc) {
                    const msg = doc.data();
                    if (msg.sender === otherUser) {
                        showNotification(otherName, msg.text || '📎 Attachment');
                    }
                }
            });
        }

        // Update favicon badge with unread count
        let unread = 0;
        snapshot.forEach(doc => {
            const msg = doc.data();
            if (msg.sender === otherUser && !msg.read) unread++;
        });
        if (document.hidden && unread > 0) {
            setFaviconBadge(unread);
        } else if (!document.hidden) {
            setFaviconBadge(0);
        }
    });

function markMessagesAsRead(snapshot) {
    if (!snapshot) return;
    snapshot.forEach(doc => {
        const msg = doc.data();
        if (msg.sender === otherUser && !msg.read) {
            doc.ref.update({ read: true }).catch(() => {});
        }
    });
}

function insertNewMessagesDivider(snapshot, messagesArea) {
    // Find the first unread message from the other user
    let firstUnreadId = null;
    snapshot.forEach(doc => {
        const msg = doc.data();
        if (!firstUnreadId && msg.sender === otherUser && !msg.read) {
            firstUnreadId = doc.id;
        }
    });

    if (!firstUnreadId) return;

    const msgEl = document.getElementById('msg-' + firstUnreadId);
    if (!msgEl) return;

    const divider = document.createElement('div');
    divider.className = 'new-messages-divider';
    divider.id = 'newMsgDivider';
    divider.innerHTML = '<span>New Messages</span>';
    messagesArea.insertBefore(divider, msgEl);
    newMessagesDividerId = firstUnreadId;
}

function removeNewMessagesDivider() {
    const divider = document.getElementById('newMsgDivider');
    if (divider) divider.remove();
    newMessagesDividerId = null;
}

function createMessageElement(id, msg) {
    const div = document.createElement('div');
    div.id = 'msg-' + id;
    const isOwn = msg.sender === currentUser;
    div.classList.add('message', isOwn ? 'own' : 'other', msg.sender);

    const time = msg.timestamp
        ? new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Swipe right to reply
    let startX = 0;
    let swiping = false;
    let replyIndicator = null;
    let lastTranslate = 0;

    div.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        swiping = false;
        lastTranslate = 0;
    });

    div.addEventListener('touchmove', (e) => {
        const diff = e.touches[0].clientX - startX;
        if (diff > 10) {
            swiping = true;
            lastTranslate = Math.min(diff * 0.5, 80);
            div.style.transform = `translateX(${lastTranslate}px)`;
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
        div.style.transition = 'transform 0.2s ease';
        div.style.transform = '';

        // Remove reply indicator
        if (replyIndicator) {
            replyIndicator.remove();
            replyIndicator = null;
        }

        if (swiping && lastTranslate > 50) {
            quickReply(id);
        }
        swiping = false;
        lastTranslate = 0;
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
    const readTick = isOwn ? (msg.read ? '<span class="tick read">Seen</span>' : '') : '';
    const pinnedLabel = msg.pinned ? ' · <span class="pinned-label">📌 pinned</span>' : '';

    let menuItems = '';
    menuItems += `<button class="dropdown-item" onclick="event.stopPropagation(); quickReply('${id}')">↩️ Reply</button>`;
    menuItems += `<button class="dropdown-item" onclick="event.stopPropagation(); quickReact('${id}')">❤️ React</button>`;
    if (msg.text) {
        menuItems += `<button class="dropdown-item" onclick="event.stopPropagation(); copyMsgText('${id}')">📋 Copy</button>`;
    }
    if (isOwn && msg.type === 'text' && msg.text && msg.timestamp) {
        const msgTime = msg.timestamp.toDate().getTime();
        const fiveMinAgo = Date.now() - 5 * 60 * 1000;
        if (msgTime > fiveMinAgo) {
            menuItems += `<button class="dropdown-item" data-edit-text="${escapeHtml(msg.text).replace(/"/g, '&quot;')}" onclick="event.stopPropagation(); openEditModal('${id}', this.dataset.editText)">✏️ Edit</button>`;
        }
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
            ${msg.text ? `<div class="message-text" data-raw-text="${escapeHtml(msg.text).replace(/"/g, '&quot;')}">${formatText(msg.text)}</div>` : ''}
        </div>
        <div class="link-preview-container"></div>
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
    if (msg.text) {
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
    if (!text) return;

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

    const savedText = input.value;
    const savedReply = replyingTo ? { ...replyingTo } : null;

    input.value = '';
    cancelReply();
    removeNewMessagesDivider();
    input.focus();
    setTyping(false);
    toggleMicSend();
    autoResize(input);

    db.collection('messages').add(msgData).then(() => {
        updateLastMessageTime();
    }).catch(() => {
        input.value = savedText;
        if (savedReply) {
            replyingTo = savedReply;
            const preview = document.getElementById('replyPreview');
            document.getElementById('replyName').textContent = savedReply.sender === 'hubby' ? 'Hubby' : 'Wifeyy';
            document.getElementById('replyText').textContent = savedReply.text || '';
            preview.style.display = 'flex';
        }
        toggleMicSend();
        showToast('Failed to send message');
    });
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
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
        showToast('File too large (max 10MB)');
        return;
    }

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
        updateLastMessageTime();
    }).catch(err => {
        progressEl.style.display = 'none';
        cancelReply();
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
function toggleRecording() {
    if (isRecording) {
        stopRecordingAndSend();
    } else {
        startRecording();
    }
}

function startRecording() {
    if (isRecording) return;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('Voice recording not supported');
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
            stream.getTracks().forEach(t => t.stop());
            cleanupRecordingUI();
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
            stream.getTracks().forEach(t => t.stop());
            cleanupRecordingUI();
            showToast('Recording failed');
        };

        mediaRecorder.start(100);

        // UI: show recording state
        const micBtn = document.getElementById('micBtn');
        micBtn.innerHTML = '&#9632;';
        micBtn.classList.add('recording');

        const indicator = document.getElementById('recordingIndicator');
        indicator.style.display = 'flex';
        recordingSeconds = 0;
        document.getElementById('recTimer').textContent = '0:00';
        recordingTimer = setInterval(() => {
            recordingSeconds++;
            const min = Math.floor(recordingSeconds / 60);
            const sec = recordingSeconds % 60;
            document.getElementById('recTimer').textContent = `${min}:${sec.toString().padStart(2, '0')}`;
        }, 1000);

        // Slide-to-cancel setup
        setupSlideToCancel(indicator);
    }).catch(() => showToast('Microphone access denied'));
}

function stopRecordingAndSend() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        mediaRecorder.stop();
    }
}

function cancelRecording() {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
        const stream = mediaRecorder.stream;
        mediaRecorder.ondataavailable = null;
        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
            cleanupRecordingUI();
        };
        mediaRecorder.stop();
    }
    audioChunks = [];
}

function cleanupRecordingUI() {
    isRecording = false;
    if (recordingTimer) { clearInterval(recordingTimer); recordingTimer = null; }
    const micBtn = document.getElementById('micBtn');
    micBtn.innerHTML = '&#127908;';
    micBtn.classList.remove('recording');
    document.getElementById('recordingIndicator').style.display = 'none';
    document.getElementById('recordingIndicator').style.transform = '';
    document.getElementById('recordingIndicator').style.opacity = '';
}

function setupSlideToCancel(indicator) {
    let startX = 0;
    let swiping = false;

    const onTouchStart = (e) => {
        startX = e.touches[0].clientX;
        swiping = true;
    };

    const onTouchMove = (e) => {
        if (!swiping || !isRecording) return;
        const diff = startX - e.touches[0].clientX;
        if (diff > 0) {
            const progress = Math.min(diff / 150, 1);
            indicator.style.transform = `translateX(-${diff}px)`;
            indicator.style.opacity = 1 - (progress * 0.6);
        }
    };

    const onTouchEnd = (e) => {
        if (!swiping) return;
        swiping = false;
        const endX = e.changedTouches[0].clientX;
        const diff = startX - endX;

        if (diff > 100) {
            cancelRecording();
        } else {
            indicator.style.transform = '';
            indicator.style.opacity = '';
        }

        indicator.removeEventListener('touchstart', onTouchStart);
        indicator.removeEventListener('touchmove', onTouchMove);
        indicator.removeEventListener('touchend', onTouchEnd);
    };

    indicator.addEventListener('touchstart', onTouchStart, { passive: true });
    indicator.addEventListener('touchmove', onTouchMove, { passive: true });
    indicator.addEventListener('touchend', onTouchEnd);
}

document.getElementById('micBtn').addEventListener('contextmenu', e => e.preventDefault());

// ===== LIGHTBOX =====
function openLightbox(url) {
    const lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.innerHTML = `
        <button class="lightbox-close" onclick="this.parentElement.remove()">&#10005;</button>
        <img src="${url}" onclick="event.stopPropagation()">
    `;
    lb.onclick = (e) => { if (e.target === lb) lb.remove(); };

    let startY = 0;
    let currentY = 0;
    const img = lb.querySelector('img');

    img.addEventListener('touchstart', (e) => {
        startY = e.touches[0].clientY;
    });
    img.addEventListener('touchmove', (e) => {
        currentY = e.touches[0].clientY;
        const diff = currentY - startY;
        if (diff > 0) {
            img.style.transform = `translateY(${diff}px)`;
            img.style.opacity = 1 - (diff / 400);
            lb.style.background = `rgba(0,0,0,${0.92 - (diff / 800)})`;
        }
    });
    img.addEventListener('touchend', () => {
        const diff = currentY - startY;
        if (diff > 100) {
            lb.remove();
        } else {
            img.style.transform = '';
            img.style.opacity = '';
            lb.style.background = '';
        }
        startY = 0;
        currentY = 0;
    });

    document.body.appendChild(lb);
}

// ===== TOAST =====
let toastTimeout = null;

function showToast(text) {
    const toast = document.getElementById('toast');
    clearTimeout(toastTimeout);
    toast.textContent = text;
    toast.style.display = 'block';
    toastTimeout = setTimeout(() => toast.style.display = 'none', 1500);
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
    if (reactionCloseHandler) {
        document.removeEventListener('click', reactionCloseHandler);
        reactionCloseHandler = null;
    }
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
            reactionCloseHandler = null;
        }
    };
    reactionCloseHandler = closeHandler;
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



// ===== LINK PREVIEW =====
function extractUrl(text) {
    const regex = /(https?:\/\/[^\s]+)/gi;
    const match = text.match(regex);
    return match ? match[0] : null;
}

function createLinkPreview(url) {
    const wrapper = document.createElement('div');
    wrapper.className = 'link-preview';

    if (linkPreviewCache.has(url)) {
        wrapper.innerHTML = linkPreviewCache.get(url);
        return wrapper;
    }

    wrapper.innerHTML = `<div class="link-preview-loading">Loading preview...</div>`;

    fetch(`https://api.linkpreview.net/?q=${encodeURIComponent(url)}`)
        .then(res => res.json())
        .then(data => {
            if (data.error) throw new Error();
            const html = `
                <a href="${escapeHtml(url)}" target="_blank" class="link-preview-card">
                    ${data.image ? `<img src="${escapeHtml(data.image)}" class="link-preview-img" onerror="this.style.display='none'">` : ''}
                    <div class="link-preview-info">
                        <div class="link-preview-site">${escapeHtml(data.provider || new URL(url).hostname)}</div>
                        <div class="link-preview-title">${escapeHtml(data.title || '')}</div>
                        <div class="link-preview-desc">${escapeHtml(data.description || '')}</div>
                    </div>
                </a>
            `;
            linkPreviewCache.set(url, html);
            wrapper.innerHTML = html;
        })
        .catch(() => {
            const html = `
                <a href="${escapeHtml(url)}" target="_blank" class="link-preview-card link-preview-fallback">
                    <div class="link-preview-info">
                        <div class="link-preview-site">${escapeHtml(new URL(url).hostname)}</div>
                        <div class="link-preview-title">${escapeHtml(url)}</div>
                    </div>
                </a>
            `;
            linkPreviewCache.set(url, html);
            wrapper.innerHTML = html;
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
            <textarea id="editInput" rows="3" autocomplete="off"></textarea>
            <div class="edit-modal-actions">
                <button class="edit-cancel-btn" onclick="closeModal()">Cancel</button>
                <button class="edit-save-btn" onclick="saveEdit()">Save</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    const input = document.getElementById('editInput');
    input.value = currentText;
    autoResize(input);
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('input', function() { autoResize(this); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
    });
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
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
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
    if (currentUser !== 'hubby') return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;
    if (Notification.permission === 'denied') return;
    Notification.requestPermission();
}

// Request notification permission on every user click until granted/denied
document.addEventListener('click', function requestNotifOnInteraction() {
    requestNotificationPermission();
});

function showNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    try {
        const n = new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>'
        });
        n.onclick = () => { window.focus(); n.close(); };
    } catch (e) {
        console.error('Notification error:', e);
    }
}

// ===== FAVICON BADGE =====
let unreadCount = 0;
const baseFavicon = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💬</text></svg>';

function setFaviconBadge(count) {
    unreadCount = count;
    document.title = count > 0 ? `(${count}) Our Chat` : 'Our Chat';

    if (count === 0) {
        document.querySelector('link[rel="icon"]').href = baseFavicon;
        return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    const img = new Image();
    img.onload = () => {
        ctx.drawImage(img, 0, 0, 64, 64);

        const badge = count > 99 ? '99+' : String(count);
        ctx.fillStyle = '#ff3b30';
        ctx.beginPath();
        ctx.arc(48, 16, 14, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badge, 48, 17);

        document.querySelector('link[rel="icon"]').href = canvas.toDataURL();
    };
    img.src = baseFavicon;
}

// ===== SCROLL TO BOTTOM =====
function scrollToBottom() {
    const messagesArea = document.getElementById('messagesArea');
    messagesArea.scrollTop = messagesArea.scrollHeight;
    document.getElementById('scrollBottomBtn').style.display = 'none';
    removeNewMessagesDivider();
}

document.getElementById('messagesArea').addEventListener('scroll', function() {
    const btn = document.getElementById('scrollBottomBtn');
    const atBottom = this.scrollHeight - this.scrollTop <= this.clientHeight + 100;
    btn.style.display = atBottom ? 'none' : 'flex';
});

// ===== INIT =====
initTyping();
watchTyping();

// Register service worker for mobile notifications
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
}

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
        let searchTimeout;
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                const query = searchInput.value.trim().toLowerCase();
                const messages = document.querySelectorAll('.message');
                messages.forEach(msg => {
                    const textEl = msg.querySelector('.message-text');
                    if (!textEl) return;
                    if (!query) {
                        msg.style.display = '';
                        textEl.innerHTML = formatText(textEl.dataset.rawText || textEl.textContent);
                        return;
                    }
                    if (!textEl.dataset.rawText) {
                        textEl.dataset.rawText = textEl.textContent;
                    }
                    const text = textEl.dataset.rawText.toLowerCase();
                    if (text.includes(query)) {
                        msg.style.display = '';
                        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
                        textEl.innerHTML = formatText(textEl.dataset.rawText).replace(regex, '<mark>$1</mark>');
                    } else {
                        msg.style.display = 'none';
                    }
                });
            }, 200);
        });
    }
});

function clearSearch() {
    const messages = document.querySelectorAll('.message');
    messages.forEach(msg => {
        msg.style.display = '';
        const textEl = msg.querySelector('.message-text');
        if (textEl && textEl.dataset.rawText) {
            textEl.innerHTML = formatText(textEl.dataset.rawText);
        }
    });
}
