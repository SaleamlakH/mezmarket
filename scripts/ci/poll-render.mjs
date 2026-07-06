const apiKey = process.env.RENDER_API_KEY;
const serviceId = process.env.RENDER_SERVICE_ID;
const deployId = process.env.RENDER_DEPLOY_ID;

if (!apiKey || !serviceId || !deployId) {
  console.error('RENDER_API_KEY, RENDER_SERVICE_ID or RENDER_DEPLOY_ID is not set');
  process.exit(1);
}

const MAX_ATTEMPTS = 30;
const INTERVAL_MS = 10_000;

for (let i = 1; i <= MAX_ATTEMPTS; i++) {
  const response = await fetch(
    `https://api.render.com/v1/services/${serviceId}/deploys/${deployId}`,
    { headers: { Authorization: `Bearer ${apiKey}` } },
  );

  if (!response.ok) {
    console.error(`Render API error: ${response.status}`);
    process.exit(1);
  }

  const data = await response.json();
  const status = data.status;

  console.log(`Attempt ${i} status: ${status}`);

  if (status === 'live') {
    console.log('API is live.');
    process.exit(0);
  }

  const failStatus = ['build_failed', 'pre_deploy_failed', 'update_failed', 'canceled'];
  if (failStatus.includes(status)) {
    console.error('API deployment failed.');
    process.exit(1);
  }

  if (i < MAX_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, INTERVAL_MS));
  }
}

console.error('Timed out waiting for API deployment.');
process.exit(1);
