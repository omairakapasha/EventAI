import 'dotenv/config';
import fs from 'fs';

const LOG_FILE = './startup-debug.log';
function log(msg: string) {
    fs.appendFileSync(LOG_FILE, msg + '\n');
}

fs.writeFileSync(LOG_FILE, '');

process.on('uncaughtException', (err) => {
    log(`UNCAUGHT: ${err.message}\n${err.stack}`);
    process.exit(1);
});
process.on('unhandledRejection', (err: any) => {
    log(`UNHANDLED: ${err?.message || err}\n${err?.stack}`);
});

async function main() {
    try {
        log('1: importing env');
        const { config } = await import('./src/config/env.js');
        log(`2: redis url = ${config.redis.url}`);
        log('3: importing redis');
        const { getRedisClient } = await import('./src/config/redis.js');
        log('4: calling getRedisClient');
        const c = await getRedisClient();
        log(`5: redis = ${c ? 'connected' : 'null'}`);
        log('6: importing index (starts server)');
        await import('./src/index.js');
        log('7: server started OK');
    } catch (err: any) {
        log(`ERROR: ${err.message}\n${err.stack}`);
    }
}
main();
setTimeout(() => { log('TIMEOUT: exiting'); process.exit(0); }, 15000);
