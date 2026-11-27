import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
	migrateSettings,
	settingsMigrationVersion,
} from '../../src/browser/settings-migration.ts';

describe('Stored settings migration', () => {
	test('The forced Tor region is dropped once; a deliberate choice can be remade.', () => {
		// Both the tokenized spelling (this build writes it) and the plain
		// one (builds from before the tokenized keys) are repaired.
		const settings = { UseSocks5: 'tor' };
		const migrated = migrateSettings(settings);
		assert.equal('UseSocks5' in migrated, false);
		assert.equal(migrated['SettingsMigrated'], settingsMigrationVersion);
		assert.equal(migrateSettings({ UseSocks5: 'eu' })['UseSocks5'], 'eu');
	});

	test('Already-migrated settings are left alone.', () => {
		const settings = {
			SettingsMigrated: settingsMigrationVersion,
			UseSocks5: 'eu',
		};
		assert.equal(migrateSettings(settings), settings);
	});

	test('Other keys are never touched.', () => {
		const settings = {
			UseSocks5: 'tor',
			Theme: 'light',
			Icon: 'https://example.com/favicon.ico',
		};
		const { UseSocks5, ...rest } = migrateSettings(settings);
		assert.equal(UseSocks5, undefined);
		assert.deepEqual(rest, {
			Theme: 'light',
			Icon: 'https://example.com/favicon.ico',
			SettingsMigrated: settingsMigrationVersion,
		});
	});
});
