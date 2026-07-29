import { readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { QualificationError, hashFile, runLogged, tools, writeJson } from './qa-common.mjs';

async function filesUnder(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  }));
  return nested.flat();
}

export async function validateAab(root, evidence) {
  const build = resolve(root, 'client/WarriorRaising/android/build');
  const aab = resolve(build, 'WarriorRaising-dev.aab');
  const symbols = (await filesUnder(build)).find((path) => /\.symbols\.zip$/.test(path));
  if (!symbols) throw new QualificationError('Unity did not produce a public symbols archive.');
  const [aabHash, symbolsHash] = await Promise.all([hashFile(aab), hashFile(symbols)]);
  await runLogged(resolve(evidence, 'bundletool-validate.log'), tools.java, ['-jar', tools.bundletool, 'validate', `--bundle=${aab}`], { cwd: root });
  const manifest = await runLogged(resolve(evidence, 'bundletool-manifest.log'), tools.java, ['-jar', tools.bundletool, 'dump', 'manifest', `--bundle=${aab}`], { cwd: root });
  if (!/package="com\.warriorraising\.dev"/.test(manifest.stdout)) throw new QualificationError('AAB manifest package does not match com.warriorraising.dev.');
  const contents = await runLogged(resolve(evidence, 'aab-contents.log'), tools.jar, ['tf', aab], { cwd: root });
  const pad = /^AddressablesAssetPack\/assets\/aa\/CustomAssetPacksData\.json$/m.test(contents.stdout)
    && /^AddressablesAssetPack\/manifest\/AndroidManifest\.xml$/m.test(contents.stdout);
  if (!pad) throw new QualificationError('AAB does not contain the install-time content asset pack.');
  const timestamp = new Date().toISOString();
  const artifacts = {
    aab: { format: 'AAB', path: relative(root, aab), ...aabHash },
    symbols: { enabled: true, level: 'public', format: 'ZIP', path: relative(root, symbols), ...symbolsHash },
    pad: { present: true, group: 'content', assetPack: 'AddressablesAssetPack', deliveryType: 'install-time' },
  };
  await writeJson(resolve(build, 'output.json'), { ...artifacts.aab, unityVersion: '6000.5.4f1', buildTarget: 'Android', timestamp });
  await writeJson(resolve(build, 'symbols.json'), { ...artifacts.symbols, unityVersion: '6000.5.4f1', buildTarget: 'Android', timestamp });
  return { build, aab, artifacts };
}

export async function installAab(root, evidence, artifacts) {
  const apks = resolve(artifacts.build, `WarriorRaising-dev-${Date.now()}.apks`);
  await runLogged(resolve(evidence, 'bundletool-build-apks.log'), tools.java, ['-jar', tools.bundletool, 'build-apks', `--bundle=${artifacts.aab}`, `--output=${apks}`, '--connected-device', `--adb=${tools.adb}`], { cwd: root, timeout: 600_000 });
  await runLogged(resolve(evidence, 'bundletool-install.log'), tools.java, ['-jar', tools.bundletool, 'install-apks', `--apks=${apks}`, `--adb=${tools.adb}`], { cwd: root, timeout: 300_000 });
  return { path: relative(root, apks), ...(await hashFile(apks)) };
}
