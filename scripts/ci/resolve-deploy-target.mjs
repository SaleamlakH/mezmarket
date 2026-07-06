import { appendFileSync } from 'fs';

const ref = process.env.GITHUB_REF;
const output = process.env.GITHUB_OUTPUT;

if (!ref || !output) {
  console.error('GITHUB_REF or GITHUB_OUTPUT is not set');
  process.exit(1);
}

let deployApi = false;
let deployWeb = false;

if (ref.startsWith('refs/tags/api@')) {
  deployApi = true;
} else if (ref.startsWith('refs/tags/web@')) {
  deployWeb = true;
} else {
  console.error(`Unrecognized tag ref: ${ref}`);
  process.exit(1);
}

appendFileSync(output, `deploy_api=${deployApi}\n`);
appendFileSync(output, `deploy_web=${deployWeb}\n`);

console.log(`deploy_api=${deployApi}`);
console.log(`deploy_web=${deployWeb}`);
