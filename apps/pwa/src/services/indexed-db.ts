import { openDB } from 'idb';

export const mentorDb = openDB('mentor-ai', 1, {
  upgrade(db) {
    db.createObjectStore('lessons', { keyPath: 'id' });
    db.createObjectStore('statistics', { keyPath: 'userId' });
    db.createObjectStore('speech-results', { keyPath: 'id' });
    db.createObjectStore('sync-queue', { keyPath: 'id' });
  },
});
