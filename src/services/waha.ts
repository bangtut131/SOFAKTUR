import { prisma } from "@/lib/prisma";

export const WahaService = {
    async getConfig() {
        try {
            const settings = await prisma.systemSetting.findMany({
                where: {
                    key: { in: ['WAHA_API_URL', 'WAHA_API_KEY', 'WAHA_SESSION_ID'] }
                }
            });

            const getVal = (k: string) => settings.find(s => s.key === k)?.value;

            const config = {
                baseUrl: getVal('WAHA_API_URL') || process.env.WAHA_API_URL || 'http://localhost:3000',
                apiKey: getVal('WAHA_API_KEY') || '',
                sessionId: getVal('WAHA_SESSION_ID') || 'default',
            };

            console.log("WAHA Config Loaded:", { ...config, apiKey: config.apiKey ? '***' : 'none' });
            return config;
        } catch (e) {
            console.error("WAHA Config Fetch Error:", e);
            return {
                baseUrl: process.env.WAHA_API_URL || 'http://localhost:3000',
                apiKey: '',
                sessionId: 'default',
            };
        }
    },

    async checkConnection(): Promise<boolean> {
        const config = await this.getConfig();
        try {
            const headers: any = {};
            if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

            const res = await fetch(`${config.baseUrl}/api/sessions`, { headers });
            return res.ok;
        } catch (error) {
            console.error("WAHA Connection Failed:", error);
            return false;
        }
    },

    async sendText(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
        if (!phone) return { success: false, error: "No phone number provided" };

        const config = await this.getConfig();

        // Format phone number
        let formattedPhone = phone.replace(/\D/g, '');
        if (formattedPhone.startsWith('0')) {
            formattedPhone = '62' + formattedPhone.slice(1);
        }
        if (!formattedPhone.endsWith('@c.us')) {
            formattedPhone += '@c.us';
        }

        try {
            const headers: any = {
                'Content-Type': 'application/json',
            };
            if (config.apiKey) headers['X-Api-Key'] = config.apiKey;

            console.log(`Sending WAHA message to ${config.baseUrl}/api/sendText session=${config.sessionId}`);

            const res = await fetch(`${config.baseUrl}/api/sendText`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    session: config.sessionId,
                    chatId: formattedPhone,
                    text: message,
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                // Check if HTML (error page)
                if (err.trim().startsWith('<')) {
                    console.error("WAHA returned HTML error (likely 404/500 page):", err.substring(0, 100));
                    return { success: false, error: `Server returned HTML. Check URL. URL Used: ${config.baseUrl}` };
                }
                return { success: false, error: err };
            }

            return { success: true };
        } catch (error: any) {
            console.error("WAHA Send Error:", error);
            return { success: false, error: error.message };
        }
    }
};
