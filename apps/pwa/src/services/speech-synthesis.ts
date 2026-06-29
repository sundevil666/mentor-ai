import { readSpeechVoicePreference } from './user-preferences';

export type SpeechVoiceOption = {
  label: string;
  value: string;
  description: string;
  voice: SpeechSynthesisVoice;
};

const femaleVoiceHints = [
  'allison',
  'ava',
  'carmit',
  'damayanti',
  'fiona',
  'joana',
  'karen',
  'kathy',
  'kyoko',
  'laura',
  'lekha',
  'luciana',
  'mariska',
  'mei-jia',
  'melina',
  'milena',
  'moira',
  'monica',
  'nora',
  'paulina',
  'samantha',
  'sara',
  'satu',
  'serena',
  'shelley',
  'susan',
  'tessa',
  'ting-ting',
  'veena',
  'victoria',
  'yuna',
  'zira',
  'woman',
  'girl',
  'female',
];

export function getAvailableSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return [];
  }

  return window.speechSynthesis.getVoices();
}

export async function waitForSpeechVoices(timeoutMs = 1200): Promise<SpeechSynthesisVoice[]> {
  const voices = getAvailableSpeechVoices();

  if (voices.length > 0 || typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return voices;
  }

  return new Promise((resolve) => {
    const timeout = window.setTimeout(() => {
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(getAvailableSpeechVoices());
    }, timeoutMs);

    function handleVoicesChanged() {
      window.clearTimeout(timeout);
      window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      resolve(getAvailableSpeechVoices());
    }

    window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
  });
}

export function getFemaleSpeechVoiceOptions(voices = getAvailableSpeechVoices()): SpeechVoiceOption[] {
  const likelyFemaleVoices = voices.filter(isLikelyFemaleVoice);
  const options = likelyFemaleVoices.length > 0 ? likelyFemaleVoices : voices;

  return options
    .slice()
    .sort((left, right) => formatVoiceLabel(left).localeCompare(formatVoiceLabel(right)))
    .map((voice) => ({
      label: formatVoiceLabel(voice),
      value: voice.voiceURI,
      description: `${voice.lang}${voice.localService ? ' · device' : ' · browser'}`,
      voice,
    }));
}

export function speakWithPreferredVoice(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return null;
  }

  const utterance = createPreferredSpeechUtterance(text);

  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);

  return utterance;
}

export function createPreferredSpeechUtterance(text: string) {
  const utterance = new SpeechSynthesisUtterance(text);
  const preferredVoiceURI = readSpeechVoicePreference();
  const voice = getAvailableSpeechVoices().find((item) => item.voiceURI === preferredVoiceURI);

  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang;
  }

  return utterance;
}

function isLikelyFemaleVoice(voice: SpeechSynthesisVoice) {
  const searchable = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  return femaleVoiceHints.some((hint) => searchable.includes(hint));
}

function formatVoiceLabel(voice: SpeechSynthesisVoice) {
  return `${voice.name} (${voice.lang})`;
}
