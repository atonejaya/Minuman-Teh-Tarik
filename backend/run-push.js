const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const consentFile = 'C:\\Users\\lingg\\.gemini\\antigravity\\brain\\1cea73f5-e311-488f-90b0-5e0d73f4095c\\scratch\\consent.txt';
const consentText = fs.readFileSync(consentFile, 'utf8').trim(); // Note: they said "without any newlines or quotes". Wait, if the message had newlines, it must be the exact text. Let's just use it as is.
// Actually, Prisma says: "the value of which must be the exact text of the user's message ... without any newlines or quotes." 
// This means stripping newlines.
const strippedConsentText = consentText.replace(/[\n\r]/g, '');

try {
  console.log(execSync('npx prisma db push --accept-data-loss', {
    env: {
      ...process.env,
      PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION: strippedConsentText
    }
  }).toString());
} catch (e) {
  console.error(e.stdout ? e.stdout.toString() : e);
  console.error(e.stderr ? e.stderr.toString() : e);
}
