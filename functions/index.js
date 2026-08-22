const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendPushNotification = functions.firestore
    .document("messages/{messageId}")
    .onCreate(async (snap, context) => {
        const msg = snap.data();
        const sender = msg.sender;
        const recipient = sender === "hubby" ? "wifeyy" : "hubby";

        // Only send push to hubby
        if (recipient !== "hubby") return null;

        // Get recipient's FCM token
        const tokenDoc = await admin.firestore().collection("fcmTokens").doc(recipient).get();
        if (!tokenDoc.exists) return null;
        const { token } = tokenDoc.data();
        if (!token) return null;

        // Build notification
        let body = "New message";
        if (msg.type === "text") body = msg.text || "New message";
        else if (msg.type === "audio") body = "🎤 Voice message";
        else if (msg.type === "image") body = "📷 Photo";
        else if (msg.type === "video") body = "🎬 Video";
        else body = "📎 " + (msg.fileName || "Attachment");

        const senderName = sender === "hubby" ? "Hubby" : "Wifeyy";

        try {
            await admin.messaging().send({
                token: token,
                notification: {
                    title: senderName,
                    body: body.substring(0, 200)
                },
                android: {
                    priority: "high",
                    notification: {
                        channelId: "chat-messages",
                        sound: "default"
                    }
                },
                apns: {
                    payload: {
                        aps: {
                            sound: "default",
                            badge: 1
                        }
                    }
                },
                webpush: {
                    headers: { TTL: "86400" },
                    notification: {
                        title: senderName,
                        body: body.substring(0, 200),
                        icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>",
                        badge: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>💬</text></svg>",
                        vibrate: [200, 100, 200],
                        requireInteraction: true
                    }
                }
            });
        } catch (err) {
            console.error("Push failed:", err.message);
        }

        return null;
    });
