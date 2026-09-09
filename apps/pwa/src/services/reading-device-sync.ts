import type { ContentProgress, ReadingDeviceSession, ReadingResumeSnapshot } from '@mentor-ai/shared';

export const readingDeviceHeartbeatMs = 5_000;
export const readingDeviceResponseTimeoutMs = 15_000;

export interface ReadingResumeDecision {
  position: number;
  sentenceStartPosition: number;
  sentenceEndPosition: number;
  updatedAt?: string;
  waitingDevices: ReadingDeviceSession[];
  synchronizedDevices: ReadingDeviceSession[];
}

export function chooseReadingResumeState(
  snapshot: ReadingResumeSnapshot,
  currentDeviceId: string,
): ReadingResumeDecision {
  const serverNow = Date.parse(snapshot.serverTime);
  const devices = snapshot.devices.filter((device) => device.deviceId !== currentDeviceId);
  const waitingDevices = devices.filter((device) => (
    device.status === 'reading' &&
    Number.isFinite(serverNow) &&
    serverNow - Date.parse(device.lastSeenAt) > readingDeviceResponseTimeoutMs
  ));
  const candidates: Array<{ position: number; sentenceStartPosition: number; sentenceEndPosition: number; updatedAt: string }> = [];
  if (snapshot.progress) candidates.push(progressCandidate(snapshot.progress));
  for (const device of snapshot.devices) {
    candidates.push({
      position: device.position,
      sentenceStartPosition: device.sentenceStartPosition,
      sentenceEndPosition: device.sentenceEndPosition,
      updatedAt: device.progressUpdatedAt,
    });
  }
  const best = candidates.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  return {
    position: Math.max(0, Math.floor(best?.position ?? 0)),
    sentenceStartPosition: Math.max(0, Math.floor(best?.sentenceStartPosition ?? best?.position ?? 0)),
    sentenceEndPosition: Math.max(0, Math.floor(best?.sentenceEndPosition ?? best?.position ?? 0)),
    updatedAt: best?.updatedAt,
    waitingDevices,
    synchronizedDevices: devices.filter((device) => !waitingDevices.includes(device)),
  };
}

function progressCandidate(progress: ContentProgress) {
  return {
    position: progress.position,
    sentenceStartPosition: progress.position,
    sentenceEndPosition: progress.position,
    updatedAt: progress.updatedAt,
  };
}

export function readingDeviceLabel(userAgent: string) {
  if (/iPad/i.test(userAgent) || (/Macintosh/i.test(userAgent) && /Mobile/i.test(userAgent))) return 'iPad';
  if (/Android/i.test(userAgent)) return /Mobile/i.test(userAgent) ? 'Android phone' : 'Android tablet';
  if (/iPhone/i.test(userAgent)) return 'iPhone';
  if (/Macintosh/i.test(userAgent)) return 'Mac';
  if (/Windows/i.test(userAgent)) return 'Windows laptop';
  return 'Browser device';
}
