// Standalone WhatsApp Device Manager using whatsapp-web.js
// Each device = a separate whatsapp-web.js Client with its own session

import { Client, LocalAuth } from 'whatsapp-web.js';

interface DeviceSession {
    client: Client;
    id: string;          // DB device ID
    sessionId: string;   // unique session name
    status: 'INITIALIZING' | 'SCAN_QR' | 'CONNECTED' | 'DISCONNECTED';
    qr: string | null;
    phone: string | null;
    name: string;
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

    // Initialize a new device client
    async initDevice(deviceId: string, sessionId: string, name: string): Promise<DeviceSession> {
        // If already exists, return it
        if (this.devices.has(sessionId)) {
            return this.devices.get(sessionId)!;
        }

        console.log(`[WaDevice] Initializing device: ${sessionId} (${name})`);

        const client = new Client({
            authStrategy: new LocalAuth({ clientId: sessionId }),
            puppeteer: {
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                ],
            },
        });

        const session: DeviceSession = {
            client,
            id: deviceId,
            sessionId,
            status: 'INITIALIZING',
            qr: null,
            phone: null,
            name,
        };

        this.devices.set(sessionId, session);

        // QR Event
        client.on('qr', (qr: string) => {
            console.log(`[WaDevice] QR received for ${sessionId}`);
            session.qr = qr;
            session.status = 'SCAN_QR';
        });

        // Ready Event
        client.on('ready', async () => {
            console.log(`[WaDevice] Device ready: ${sessionId}`);
            session.status = 'CONNECTED';
            session.qr = null;

            try {
                const info = client.info;
                if (info?.wid?._serialized) {
                    session.phone = info.wid._serialized.replace('@c.us', '');
                }
            } catch (e) {
                console.error('[WaDevice] Error getting phone info:', e);
            }
        });

        // Auth failure
        client.on('auth_failure', (msg: string) => {
            console.error(`[WaDevice] Auth failure for ${sessionId}:`, msg);
            session.status = 'DISCONNECTED';
            session.qr = null;
        });

        // Disconnected
        client.on('disconnected', (reason: string) => {
            console.log(`[WaDevice] Disconnected ${sessionId}:`, reason);
            session.status = 'DISCONNECTED';
            session.qr = null;
        });

        // Initialize
        try {
            await client.initialize();
        } catch (e) {
            console.error(`[WaDevice] Failed to initialize ${sessionId}:`, e);
            session.status = 'DISCONNECTED';
        }

        return session;
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
        if (device.status !== 'CONNECTED') return { success: false, error: `Device not connected (${device.status})` };

        try {
            // Format phone number
            let chatId = phone.replace(/\D/g, '');
            if (chatId.startsWith('0')) {
                chatId = '62' + chatId.slice(1);
            }
            if (!chatId.includes('@')) {
                chatId = chatId + '@c.us';
            }

            await device.client.sendMessage(chatId, message);
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
                await device.client.destroy();
            } catch (e) {
                console.error(`[WaDevice] Destroy error:`, e);
            }
            this.devices.delete(sessionId);
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
