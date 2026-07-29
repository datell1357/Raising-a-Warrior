import { fail, object } from '../contract-utils.mjs';
import { shouldIgnoreRepositoryPath } from '../repository-model.mjs';
import { workflows } from './contracts.mjs';
import { childPointer, equal, isInfrastructureConfiguration, pointer, stripComments } from './shared.mjs';

export function boundaries(model) {
  const forbidden = /microservices|kubernetes|websocket-gateway|play-feature-delivery|ios-release-targets/i;
  for (const path of model.allPaths) {
    if (forbidden.test(path)) fail('FORBIDDEN_INFRASTRUCTURE', pointer(path), 'forbidden infrastructure is outside T5');
  }
  for (const [path, file] of Object.entries(model.repositoryFiles)) {
    const implementation = ['.github/', 'backend/', 'client/', 'release/environments/', 'web/', 'tools/content-pipeline/'].some((root) => path.startsWith(root)) || ['package.json', 'tsconfig.json', 'tsconfig.base.json', '.gitignore'].includes(path);
    if (!implementation) continue;
    const content = stripComments(path, file.content);
    if (isInfrastructureConfiguration(path) && content.trim() !== '') fail('FORBIDDEN_INFRASTRUCTURE', pointer(path), 'infrastructure configuration is outside T5');
    if (/\.[cm]?[jt]sx?$/i.test(path) && /\bnew\s+URL\s*\(/.test(content)) fail('TYPESCRIPT_URL_FORBIDDEN', pointer(path), 'runtime URL construction is forbidden during T5');
    if (forbidden.test(content)) fail('FORBIDDEN_INFRASTRUCTURE', pointer(path), 'forbidden infrastructure configuration is outside T5');
  }
}

export function entries(value, at, output = []) {
  if (Array.isArray(value)) value.forEach((item, index) => entries(item, `${at}/${index}`, output));
  else if (value && typeof value === 'object') for (const [key, item] of Object.entries(value)) {
    const child = childPointer(at, key);
    output.push([key, item, child]);
    entries(item, child, output);
  }
  return output;
}

export function workflowCommand(value, at) {
  if (typeof value !== 'string') return;
  if (/\bpublish\b/i.test(value)) fail('WORKFLOW_PUBLISH_FORBIDDEN', at, 'publishing commands are forbidden during T5');
  if (/\b(?:deploy|rollout)\b/i.test(value)) fail('WORKFLOW_DEPLOY_FORBIDDEN', at, 'deployment commands are forbidden during T5');
}

export function workflowAction(value, at, release) {
  if (typeof value !== 'string') fail('WORKFLOW_ACTION_UNPINNED', at, 'workflow actions must have immutable SHA pins');
  const match = /^([^@]+)@([0-9a-f]{40})$/i.exec(value);
  if (!match) fail('WORKFLOW_ACTION_UNPINNED', at, 'workflow actions must have immutable SHA pins');
  const slug = match[1];
  if (slug === 'actions/attest-build-provenance' && !release) fail('WORKFLOW_OIDC_FORBIDDEN', at, 'attestation is release-only');
  const trusted = release ? ['actions/checkout', 'oven-sh/setup-bun', 'actions/attest-build-provenance'] : ['actions/checkout', 'oven-sh/setup-bun'];
  if (!trusted.includes(slug)) fail('WORKFLOW_ACTION_UNTRUSTED', at, 'workflow action is not trusted for T5');
}

export function releaseStepsPointer(jobs, at) {
  const name = Object.hasOwn(jobs, 'verify') ? 'verify' : Object.keys(jobs).sort()[0];
  return name ? `${at}/jobs/${name}/steps` : `${at}/jobs`;
}

export function releaseAttestation(workflow, at) {
  const jobs = object(workflow.jobs, `${at}/jobs`);
  const stepsAt = releaseStepsPointer(jobs, at);
  const attestations = [];
  for (const [jobName, job] of Object.entries(jobs)) {
    if (!job || typeof job !== 'object' || !Array.isArray(job.steps)) continue;
    job.steps.forEach((step, index) => {
      if (step && typeof step === 'object' && typeof step.uses === 'string' && step.uses.startsWith('actions/attest-build-provenance@')) attestations.push({ step, at: `${at}/jobs/${jobName}/steps/${index}` });
    });
  }
  if (attestations.length !== 1) fail('WORKFLOW_ATTESTATION_SUBJECTS_INVALID', stepsAt, 'release must contain exactly one attestation action');
  const { step } = attestations[0];
  if (!equal(Object.keys(step).sort(), ['uses', 'with']) || !step.with || typeof step.with !== 'object' || Array.isArray(step.with) || !equal(Object.keys(step.with), ['subject-path']) || step.with['subject-path'] !== 'release/provenance/contract.json') fail('WORKFLOW_ATTESTATION_SUBJECTS_INVALID', stepsAt, 'release attestation subject must be the provenance contract only');
}

export function workflowPolicy(model) {
  const actual = [...new Set(model.allPaths.filter((path) => /^\.github\/workflows\/[^/]+\.ya?ml$/i.test(path)))].sort();
  const unexpected = actual.find((path) => !workflows.includes(path.slice('.github/workflows/'.length)));
  if (unexpected) fail('WORKFLOW_FILE_UNEXPECTED', pointer(unexpected), 'workflow file is not part of the T5 inventory');
  for (const name of workflows) {
    const workflow = model.workflows[name];
    const at = `/.github/workflows/${name}`;
    if (!workflow) fail('REQUIRED_FILE_MISSING', at, 'required workflow is missing');
    const release = name === 'release.yml';
    if (!equal(workflow.on, release ? { workflow_dispatch: null } : { push: { branches: ['main'] }, pull_request: null })) fail('WORKFLOW_TRIGGER_FORBIDDEN', `${at}/on`, 'workflow triggers must be exact');
    if (!equal(workflow.permissions, release ? { contents: 'read', 'id-token': 'write', attestations: 'write' } : { contents: 'read' })) fail('WORKFLOW_PERMISSION_EXCESSIVE', `${at}/permissions`, 'workflow permissions must be exact');
    const jobs = object(workflow.jobs, `${at}/jobs`);
    for (const [jobName, job] of Object.entries(jobs)) if (job && typeof job === 'object' && Object.hasOwn(job, 'permissions')) fail('WORKFLOW_JOB_PERMISSION_EXCESSIVE', `${at}/jobs/${jobName}/permissions`, 'job-level permissions are forbidden');
    const values = entries(workflow, at);
    if (!values.some(([key, value]) => key === 'run' && value === 'bun ci')) fail('WORKFLOW_BUN_CI_REQUIRED', at, 'workflow must execute literal bun ci');
    for (const [key, value, valueAt] of values) {
      if (key === 'run' || key === 'uses') workflowCommand(value, valueAt);
      if (key === 'uses') workflowAction(value, valueAt, release);
    }
    if (!release && values.some(([key]) => key === 'id-token')) fail('WORKFLOW_OIDC_FORBIDDEN', at, 'OIDC is release-only');
    if (release) releaseAttestation(workflow, at);
  }
}
