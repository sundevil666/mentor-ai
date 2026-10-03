import type { MovieLearningReport } from '@mentor-ai/shared';
import { deleteMovieLearningReportFromCloud, fetchMovieLearningReports, synchronizeMovieLearningReports } from './api-client.js';
import { mentorDb } from './indexed-db.js';
import { createMovieReport, synchronizeMovieReports, type MovieReportStorage } from './movie-learning-report-outbox.js';

const deviceKey = 'mentor-ai-device-id';
const maximumLocalReports = 500;

const indexedDbStorage: MovieReportStorage = {
  async list() {
    return (await mentorDb).getAll('movie-learning-reports') as Promise<MovieLearningReport[]>;
  },
  async put(report) {
    await (await mentorDb).put('movie-learning-reports', report);
  },
};

export async function saveMovieLearningReport(input: {
  studentId: string;
  movieTitle: string;
  watchedAt: string;
  report: string;
}) {
  const report = createMovieReport(input, getDeviceId());
  await indexedDbStorage.put(report);
  await pruneReports(indexedDbStorage);
  dispatchUpdated();
  return report;
}

export async function loadMovieLearningReports(storage = indexedDbStorage) {
  return (await storage.list()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function pendingMovieLearningReportCount(storage = indexedDbStorage) {
  return (await storage.list()).filter((report) => !report.synchronizedAt).length;
}

export async function syncMovieLearningReports() {
  const count = await synchronizeMovieReports(indexedDbStorage, synchronizeMovieLearningReports, navigator.onLine);
  dispatchUpdated();
  return count;
}

export async function refreshMovieLearningReportsFromCloud() {
  if (!navigator.onLine) return 0;
  const [local, remote] = await Promise.all([indexedDbStorage.list(), fetchMovieLearningReports()]);
  const localById = new Map(local.map((report) => [report.id, report]));
  let merged = 0;
  for (const report of remote) {
    const current = localById.get(report.id);
    if (current && current.updatedAt > report.updatedAt) continue;
    await indexedDbStorage.put({ ...report, synchronizedAt: report.updatedAt });
    merged += 1;
  }
  if (merged) dispatchUpdated();
  return merged;
}

export async function deleteMovieLearningReport(report: MovieLearningReport) {
  if (report.synchronizedAt) {
    if (!navigator.onLine) throw new Error('Connect to the internet to remove this report from every device.');
    await deleteMovieLearningReportFromCloud(report.id);
  }
  await (await mentorDb).delete('movie-learning-reports', report.id);
  dispatchUpdated();
}

async function pruneReports(storage: MovieReportStorage) {
  const reports = (await storage.list()).sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  for (const report of reports.slice(maximumLocalReports)) {
    if (!report.synchronizedAt) continue;
    await (await mentorDb).delete('movie-learning-reports', report.id);
  }
}

function getDeviceId() {
  let id = localStorage.getItem(deviceKey);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(deviceKey, id);
  }
  return id;
}

function dispatchUpdated() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('mentor-movie-reports-updated'));
}
