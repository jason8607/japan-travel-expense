#!/usr/bin/env node
import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();
console.log("\nAdd the following to .env.local (and to Vercel project env):\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${keys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:jason.chen@anyong.com.tw`);
console.log(`CRON_SECRET=<run: openssl rand -hex 32>`);
console.log("");
