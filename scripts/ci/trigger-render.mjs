import { appendFileSync } from 'fs';

const hookUrl = process.env.RENDER_DEPLOY_HOOK_URL;
const output = process.env.GITHUB_OUTPUT;

if (!hookUrl || !output) {
  console.error('RENDER_DEPLOY_HOOK or GITHUB_OUTPUT is not set');
  process.exit(1);
}

const response = await fetch(hookUrl, { method: 'POST' });

if (!response.ok) {
  console.error(`Failed to trigger deploy: ${response.status}`);
  process.exit(1);
}

const data = await response.json();
const deployId = data.deploy.id;

console.log(`Deploy triggered. ID: ${deployId}`);
appendFileSync(output, `render_deploy_id=${deployId}\n`);
