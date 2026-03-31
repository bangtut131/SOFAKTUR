// WhatsApp Device Manager using @whiskeysockets/baileys
// Lightweight, no Chromium/Puppeteer needed — works on Railway

import * as path from 'path';
import * as fs from 'fs';

// Lazy-load baileys to prevent server crash if import fails
let baileysModule: any = null;
async function loadBaileys() {
    if (!baileysModule) {
        try {
            baileysModule = await import('@whiskeysockets/baileys');
        } catch (e) {
            console.error('[WaDevice] Failed to load baileys:', e);
            throw new Error('Baileys module not available');
        }
    }
    return baileysModule;
}

interface DeviceSession {
    socket: any;
    id: string;          // DB device ID
    sessionId: string;   // unique session name
    status: 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED' | 'DISCONNECTED';
    qr: string | null;
    phone: string | null;
    name: string;
    retryCount: number;
}

class WaDeviceManager {
    private devices: Map<string, DeviceSession> = new Map(); // sessionId -> DeviceSession
    private static instance: WaDeviceManager | null = null;

    static getInstance(): WaDeviceManager {
        if (!WaDeviceManager.instance) {
            WaDeviceManager.instance = new WaDeviceManager();
        }
        return WaDeviceManager.instance;
    }

    private getAuthDir(sessionId: string): string {
        const dir = path.join(process.cwd(), '.wa-sessions', sessionId);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        return dir;
    }

    // Initialize a new device
    async initDevice(deviceId: string, sessionId: string, name: string): Promise<DeviceSession> {
        // If already exists, return it
        if (this.devices.has(sessionId)) {
            return this.devices.get(sessionId)!;
        }

        console.log(`[WaDevice] Initializing device: ${sessionId} (${name})`);

        const session: DeviceSession = {
            socket: null,
            id: deviceId,
            sessionId,
            status: 'INITIALIZING',
            qr: null,
            phone: null,
            name,
            retryCount: 0,
        };

        this.devices.set(sessionId, session);

        try {
            await this.connectDevice(session);
        } catch (e) {
            console.error(`[WaDevice] Failed to initialize ${sessionId}:`, e);
            session.status = 'DISCONNECTED';
        }

        return session;
    }

    private async connectDevice(session: DeviceSession): Promise<void> {
        const baileys = await loadBaileys();
        const makeWASocket = baileys.default || baileys.makeWASocket;
        const { useMultiFileAuthState, DisconnectReason } = baileys;

        const authDir = this.getAuthDir(session.sessionId);
        const { state, saveCreds } = await useMultiFileAuthState(authDir);

        const socket = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            browser: ['GAS Broadcast', 'Chrome', '4.0.0'],
            generateHighQualityLinkPreview: false,
            syncFullHistory: false,
            logger: {
                level: 'silent',
                info: () => {},
                error: () => {},
                warn: () => {},
                debug: () => {},
                trace: () => {},
                child: function() { return this; },
                fatal: () => {},
            },
        });

        session.socket = socket;

        // Handle connection updates
        socket.ev.on('connection.update', (update: any) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log(`[WaDevice] QR received for ${session.sessionId}`);
                session.qr = qr;
                session.status = 'SCAN_QR';
            }

            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
                console.log(`[WaDevice] Connection closed for ${session.sessionId}, reason: ${statusCode}`);

                if (statusCode === DisconnectReason?.loggedOut) {
                    // Logged out — clean up auth and mark as disconnected
                    session.status = 'DISCONNECTED';
                    session.qr = null;
                    session.phone = null;
                    session.socket = null;
                    try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
                } else if (session.retryCount < 5) {
                    // Reconnect on other errors
                    session.retryCount++;
                    session.status = 'INITIALIZING';
                    console.log(`[WaDevice] Reconnecting ${session.sessionId} (attempt ${session.retryCount})...`);
                    setTimeout(() => this.connectDevice(session).catch(() => {
                        session.status = 'DISCONNECTED';
                    }), 3000);
                } else {
                    session.status = 'DISCONNECTED';
                    session.socket = null;
                    console.log(`[WaDevice] Max retries reached for ${session.sessionId}`);
                }
            }

            if (connection === 'open') {
                console.log(`[WaDevice] Device connected: ${session.sessionId}`);
                session.status = 'CONNECTED';
                session.qr = null;
                session.retryCount = 0;

                // Get phone number from socket user
                try {
                    const user = socket.user;
                    if (user?.id) {
                        // Baileys format: 628xxx:xx@s.whatsapp.net
                        session.phone = user.id.split(':')[0].split('@')[0];
                    }
                } catch (e) {
                    console.error('[WaDevice] Error getting phone info:', e);
                }
            }
        });

        // Save credentials on update
        socket.ev.on('creds.update', saveCreds);
    }

    // Get device session
    getDevice(sessionId: string): DeviceSession | undefined {
        return this.devices.get(sessionId);
    }

    // Get QR code for a device
    getQr(sessionId: string): string | null {
        const device = this.devices.get(sessionId);
        return device?.qr || null;
    }

    // Get device status
    getStatus(sessionId: string): { status: string; phone: string | null } {
        const device = this.devices.get(sessionId);
        if (!device) return { status: 'DISCONNECTED', phone: null };
        return { status: device.status, phone: device.phone };
    }

    // Send message via device
    async sendMessage(sessionId: string, phone: string, message: string): Promise<{ success: boolean; error?: string }> {
        const device = this.devices.get(sessionId);
        if (!device) return { success: false, error: 'Device not found' };
        if (device.status !== 'CONNECTED' || !device.socket) return { success: false, error: `Device not connected (${device.status})` };

        try {
            // Format phone number for Baileys (uses @s.whatsapp.net)
            let chatId = phone.replace(/\D/g, '');
            if (chatId.startsWith('0')) {
                chatId = '62' + chatId.slice(1);
            }
            if (!chatId.includes('@')) {
                chatId = chatId + '@s.whatsapp.net';
            }

            await device.socket.sendMessage(chatId, { text: message });
            return { success: true };
        } catch (e: any) {
            console.error(`[WaDevice] Send error on ${sessionId}:`, e);
            return { success: false, error: e.message };
        }
    }

    // Destroy a device session
    async destroyDevice(sessionId: string): Promise<void> {
        const device = this.devices.get(sessionId);
        if (device) {
            try {
                device.socket?.end?.(undefined);
                device.socket?.ws?.close?.();
            } catch (e) {
                console.error(`[WaDevice] Destroy error:`, e);
            }
            device.socket = null;
            this.devices.delete(sessionId);

            // Clean up auth files
            const authDir = this.getAuthDir(sessionId);
            try { fs.rmSync(authDir, { recursive: true, force: true }); } catch {}
        }
    }

    // List all active devices
    listDevices(): { sessionId: string; status: string; phone: string | null; name: string }[] {
        return Array.from(this.devices.values()).map(d => ({
            sessionId: d.sessionId,
            status: d.status,
            phone: d.phone,
            name: d.name,
        }));
    }
}

// Export singleton
export const waDeviceManager = WaDeviceManager.getInstance();
