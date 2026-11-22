import { describe, expect, it } from 'vitest';
import { backupFileName, buildBackup, buildExport, exportFileName, ImportError, parseImportFile } from './transfer';
import type { User } from './types';

const user: User = {
  id: 3,
  name: 'Ana',
  avatar: { shape: 'star', color: '#E4002B' },
  theme: 'dark',
  scores: { shapes: { pairs: 12, completed: 2 }, 'c-abc-123': { pairs: 4, completed: 0 } },
  correctCount: 16,
  createdAt: 100,
  lastActiveAt: 200,
};

describe('player files', () => {
  it('round-trips a player and their play days', () => {
    const file = JSON.stringify(buildExport(user, ['2026-11-20', '2026-11-21']));
    const [p] = parseImportFile(file, 999);
    expect(p.user).toEqual({ ...user, id: undefined, lastActiveAt: 999 });
    expect(p.playDays).toEqual(['2026-11-20', '2026-11-21']);
  });

  it('round-trips a backup of several players', () => {
    const file = JSON.stringify(buildBackup([{ user, playDays: [] }, { user: { ...user, name: 'Bo' }, playDays: [] }]));
    expect(parseImportFile(file).map((p) => p.user.name)).toEqual(['Ana', 'Bo']);
  });

  it('rejects bad files with a reason', () => {
    const reason = (text: string) => {
      try {
        parseImportFile(text);
      } catch (e) {
        return (e as ImportError).reason;
      }
    };
    expect(reason('{')).toBe('notJson');
    expect(reason('{"format":"flag-quiz-player"}')).toBe('notPlayerFile');
    expect(reason(JSON.stringify({ ...buildExport(user, []), version: 9 }))).toBe('unsupportedVersion');
    const bad = buildExport(user, []);
    (bad.player.avatar as { color: string }).color = 'red;}';
    expect(reason(JSON.stringify(bad))).toBe('invalid');
  });

  it('makes safe file names', () => {
    expect(exportFileName('Ana Maria')).toBe('memo-ana-maria.json');
    expect(exportFileName('../../x')).toBe('memo-x.json');
    expect(backupFileName(new Date(2026, 10, 21))).toBe('memo-players-2026-11-21.json');
  });
});
