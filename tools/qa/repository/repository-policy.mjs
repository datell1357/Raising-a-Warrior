import { validateFirebasePolicy } from './firebase-policy.mjs';
import { asmdefs, binarySecretContainers, environments, firestore, packages, provenance, repositoryContract, required, typescript } from './policy/repository-sections.mjs';
import { boundaries, workflowPolicy } from './policy/workflow-boundaries.mjs';

export { T6_UNITY_CONTRACT } from './policy/contracts.mjs';
export { runT6PolicyMutationProbes, validateUnityCandidate, validateUnityPolicyDeclaration, validateUnityProject } from './policy/unity.mjs';

export async function validateRepositoryPolicy(model) { repositoryContract(model); binarySecretContainers(model); required(model); typescript(model); asmdefs(model); environments(model); firestore(model); packages(model); validateFirebasePolicy(model); provenance(model); workflowPolicy(model); boundaries(model); }
