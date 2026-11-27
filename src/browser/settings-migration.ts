// Stored settings older builds could write wrongly. Any release that has to
// repair keys bumps settingsMigrationVersion and extends migrateSettings; the
// wrapper runs it on load, before anything reads the blob.
//
// Version 1: the site-fixes default-on coupling persisted Tor routing
// ('UseSocks5' = 'tor') for every user it switched on, and the stored value
// outlived the coupling -- it kept routing whole sessions through the Tor
// upstream even after the toggle was "off", leaving the proxy unusable
// wherever that upstream is not running. The value is dropped once; anyone
// who really wants Tor can pick it again. Builds from before the tokenized
// settings keys stored the plain spelling, so both are matched.

// This module is bundled into the site scripts: every quoted literal below
// that appears in src/obfuscation/settings.ts lists is swapped for the
// per-build token by the bundler, so keys keep their random names. The plain
// spelling is rebuilt at runtime instead of quoted so the scrubber leaves it.
export const settingsMigrationVersion = 1;

const plainTor = String.fromCharCode(116, 111, 114);

export function migrateSettings(
	settings: Record<string, unknown>
): Record<string, unknown> {
	if (Number(settings['SettingsMigrated']) >= settingsMigrationVersion)
		return settings;
	if (settings['UseSocks5'] === 'tor' || settings['UseSocks5'] === plainTor)
		delete settings['UseSocks5'];
	settings['SettingsMigrated'] = settingsMigrationVersion;
	return settings;
}
