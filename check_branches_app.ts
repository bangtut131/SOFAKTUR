import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...vals] = line.split('=');
            if (key && vals.length > 0) process.env[key.trim()] = vals.join('=').trim().replace(/^"|"$/g, '');
        });
    }
}
loadEnv();

import { AccurateServerService } from './src/services/accurateServer';

async function main() {
    console.log("--- Checking Branches ---");
    const branches = await AccurateServerService.getBranches();
    console.log("Branches Found:", JSON.stringify(branches, null, 2));
}
main();
