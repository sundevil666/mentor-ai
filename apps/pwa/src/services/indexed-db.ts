import { openDB } from 'idb';

export const mentorDb = openDB('mentor-ai', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains('lessons')) {
      db.createObjectStore('lessons', { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains('statistics')) {
      db.createObjectStore('statistics', { keyPath: 'userId' });
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

    if (!db.objectStoreNames.contains('learning-sessions')) {
      db.createObjectStore('learning-sessions', { keyPath: 'id' });
    }
  },
});
