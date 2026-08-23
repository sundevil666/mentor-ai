import { openDB } from 'idb';

export const mentorDb = openDB('mentor-ai', 12, {
  upgrade(db, oldVersion) {
    if (!db.objectStoreNames.contains('lessons')) {
      db.createObjectStore('lessons', { keyPath: 'id' });
    }

    if (oldVersion > 0 && oldVersion < 3 && db.objectStoreNames.contains('statistics')) {
      db.deleteObjectStore('statistics');
    }

    if (!db.objectStoreNames.contains('statistics')) {
      db.createObjectStore('statistics', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('speech-results')) {
      db.createObjectStore('speech-results', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('sync-queue')) {
      db.createObjectStore('sync-queue', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('student-models')) {
      db.createObjectStore('student-models', { keyPath: 'id' });
    }

    // The store key identifies the one locally restorable session. The value's
    // `id` remains a unique learning-session id used by evidence and analytics.
    if (oldVersion > 0 && oldVersion < 9 && db.objectStoreNames.contains('learning-sessions')) {
      db.deleteObjectStore('learning-sessions');
    }

    if (!db.objectStoreNames.contains('learning-sessions')) {
      db.createObjectStore('learning-sessions');
    }

    if (!db.objectStoreNames.contains('concept-evidence')) {
      db.createObjectStore('concept-evidence', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('reading-sources')) {
      db.createObjectStore('reading-sources', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('reading-books')) {
      db.createObjectStore('reading-books', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('reading-chapters')) {
      db.createObjectStore('reading-chapters', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('reading-pages')) {
      db.createObjectStore('reading-pages', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('reading-attempts')) {
      db.createObjectStore('reading-attempts', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('vocabulary-practice-items')) {
      db.createObjectStore('vocabulary-practice-items', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('update-notifications')) {
      db.createObjectStore('update-notifications', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('activity-snapshots')) {
      db.createObjectStore('activity-snapshots', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('auth-sessions')) {
      db.createObjectStore('auth-sessions', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('content-progress')) {
      db.createObjectStore('content-progress', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('my-shift-cache')) {
      db.createObjectStore('my-shift-cache', { keyPath: 'id' });
    }
  },
});
