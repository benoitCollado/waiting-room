import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import {v4 as uuidv4} from 'uuid';

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration de CORS pour autoriser les cookies
app.use(cors({ origin: 'http://127.0.0.1:5500', credentials: true }));

app.use(express.json());
app.use(cookieParser());

// Limite simultanée
const MAX_USERS = 200;

// File d'attente FIFO
let queue = [];
let activeUsers = new Set();

// Tokens valides
let tokens = new Map(); // token -> {userId, expires}

const TOKEN_TTL = 5 * 60 * 1000; // 5 minutes

// Nettoyage automatique des tokens expirés
setInterval(() => {
    const now = Date.now();
    for (const [token, info] of tokens) {
        if (info.expires < now) tokens.delete(token);
    }
}, 60 * 1000);

// Middleware : si pas de cookie "queue_id", on en génère un
app.use((req, res, next) => {
    let queueId = req.cookies?.queue_id;

    if (!queueId) {
        queueId = uuidv4();
        res.cookie("queue_id", queueId, { httpOnly: true, sameSite: "Lax" });
    }

    req.queueId = queueId;
    next();
});

// Endpoint pour rejoindre la waiting room
app.get('/join', (req, res) => {
    const userId = req.queueId; // pris depuis le cookie

    if (activeUsers.has(userId)) {
        const token = uuidv4();
        tokens.set(token, { userId, expires: Date.now() + TOKEN_TTL });
        return res.json({ status: 'allowed', token });
    }

    if (activeUsers.size < MAX_USERS) {
        activeUsers.add(userId);
        const token = uuidv4();
        tokens.set(token, { userId, expires: Date.now() + TOKEN_TTL });
        return res.json({ status: 'allowed', token });
    } else {
        if (!queue.includes(userId)) queue.push(userId);
        return res.json({ status: 'queued', position: queue.indexOf(userId) + 1 });
    }
});

// Endpoint pour quitter / libérer une place
app.get('/leave', (req, res) => {
    const userId = req.queueId; // Corrigé: req.userId -> req.queueId

    if (activeUsers.has(userId)) {
        activeUsers.delete(userId);
        // Autoriser le prochain de la queue
        if (queue.length > 0) {
            const nextUser = queue.shift();
            activeUsers.add(nextUser);
        }
    } else {
        const idx = queue.indexOf(userId);
        if (idx !== -1) queue.splice(idx, 1);
    }

    res.json({ status: 'ok' });
});

// Endpoint pour vérifier token (utilisé par Cloudflare Worker)
app.get('/verify', (req, res) => {
    const token = req.query.token;
    if (!token) return res.json({ valid: false });

    const info = tokens.get(token);
    if (!info) return res.json({ valid: false });

    // Vérifie expiration
    if (info.expires < Date.now()) {
        tokens.delete(token);
        return res.json({ valid: false });
    }

    return res.json({ valid: true });
});

app.listen(PORT, () => {
    console.log(`Waiting Room backend running on port ${PORT}`);
});
