const requiredFamilies = [
  ['scope', 'bun run validate:scope', ['scope-negative']],
  ['clean-room', 'bun run audit:clean-room -- --strict', ['provenance-negative']],
  ['schema', 'bun run test:schema', ['schema-negative']],
  ['architecture', 'bun run validate:adr', ['architecture-negative']],
  ['typecheck', 'bun run typecheck', ['type-error']],
  ['repository', 'bun run test:repo', ['repository-negative']],
  ['android-contract', 'bun run test:android-contract', ['android-negative']],
  ['unity-editmode', 'bun run test:unity:editmode', ['unity-editmode-negative']],
  ['unity-playmode', 'bun run test:unity:playmode', ['unity-playmode-negative']],
  ['android-device', 'bun run verify:android -- --variant=dev', ['android-device-negative']],
  ['firebase', 'bun run evidence:firebase-baseline', ['firebase-negative']],
  ['repository-evidence', 'bun run evidence:repo', ['evidence-negative']],
];

const blockedFamilies = [
  ['playwright-web', 'web-runner', []],
  ['perfetto', 'device-lab', []],
  ['locale', 'locale-catalog', []],
  ['release-manifest', 'release-candidate', ['rcSha256']],
];

export const REQUIRED_FAMILY_IDS = Object.freeze(requiredFamilies.map(([id]) => id));

export function createCanonicalRegistry() {
  return [
    ...requiredFamilies.map(([id, command, canaryIds]) => ({ id, command, canaryIds: [...canaryIds], required: true })),
    ...blockedFamilies.map(([id, prerequisite, requiredBindings]) => ({
      id,
      command: null,
      canaryIds: [`${id}-blocked`],
      required: false,
      blockedPrerequisite: prerequisite,
      requiredBindings,
    })),
  ];
}

function fail(code, pointer, message) {
  const error = new Error(message);
  error.code = code;
  error.pointer = pointer;
  throw error;
}

export function validateRegistry(value) {
  if (!Array.isArray(value)) fail('REGISTRY_INVALID', '', 'registry must be an array');
  const ids = new Set();
  const canaries = new Set();
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const at = `/${index}`;
    if (!item || typeof item !== 'object' || Array.isArray(item)) fail('REGISTRY_INVALID', at, 'registry item must be an object');
    if (typeof item.id !== 'string' || item.id === '') fail('REGISTRY_ID_INVALID', `${at}/id`, 'family id is required');
    if (ids.has(item.id)) fail('REGISTRY_FAMILY_DUPLICATE', `${at}/id`, 'family id must be unique');
    ids.add(item.id);
    if (!Array.isArray(item.canaryIds) || item.canaryIds.length === 0) fail('REGISTRY_CANARY_MISSING', `${at}/canaryIds`, 'at least one canary is required');
    for (let canaryIndex = 0; canaryIndex < item.canaryIds.length; canaryIndex += 1) {
      const canaryId = item.canaryIds[canaryIndex];
      if (typeof canaryId !== 'string' || canaryId === '') fail('REGISTRY_CANARY_INVALID', `${at}/canaryIds/${canaryIndex}`, 'canary id is required');
      if (canaries.has(canaryId)) fail('REGISTRY_CANARY_DUPLICATE', `${at}/canaryIds/${canaryIndex}`, 'canary id must be globally unique');
      canaries.add(canaryId);
    }
    if (item.required === true && typeof item.command !== 'string') fail('REGISTRY_COMMAND_MISSING', `${at}/command`, 'required family needs a command');
    if (item.required === false && (typeof item.blockedPrerequisite !== 'string' || item.blockedPrerequisite === '')) {
      fail('REGISTRY_BLOCKED_PREREQUISITE_MISSING', `${at}/blockedPrerequisite`, 'blocked-capable family needs a prerequisite');
    }
  }
  for (const id of REQUIRED_FAMILY_IDS) if (!ids.has(id)) fail('REGISTRY_FAMILY_OMITTED', '', `required family ${id} is missing`);
  const known = new Set(createCanonicalRegistry().map(({ id }) => id));
  for (const id of ids) if (!known.has(id)) fail('REGISTRY_FAMILY_UNKNOWN', '', `unknown family ${id}`);
  return value;
}
