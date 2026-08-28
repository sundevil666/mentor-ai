export interface PhrasePatternExample {
  id: string;
  situation: string;
  phrase: string;
  translation: string;
  slotValue: string;
}

export interface PhrasePattern {
  id: string;
  title: string;
  frame: string;
  prefix: string;
  suffix: string;
  description: string;
  level: string;
  estimatedMinutes: number;
  examples: PhrasePatternExample[];
}

export const patternLibrary: PhrasePattern[] = [
  {
    id: 'could-you-please',
    title: 'Could you …, please?',
    frame: 'Could you [action], please?',
    prefix: 'Could you',
    suffix: ', please?',
    description: 'A polite, reusable request for work, travel, shops, and everyday life.',
    level: 'A1–A2',
    estimatedMinutes: 6,
    examples: [
      { id: 'help', situation: 'Попроси помочь тебе с этим.', phrase: 'Could you help me with this, please?', translation: 'Не могли бы вы помочь мне с этим?', slotValue: 'help me with this' },
      { id: 'repeat', situation: 'Попроси повторить сказанное.', phrase: 'Could you repeat that, please?', translation: 'Не могли бы вы повторить?', slotValue: 'repeat that' },
      { id: 'speak-slowly', situation: 'Попроси говорить немного медленнее.', phrase: 'Could you speak a little more slowly, please?', translation: 'Не могли бы вы говорить немного медленнее?', slotValue: 'speak a little more slowly' },
      { id: 'send-address', situation: 'Попроси прислать адрес.', phrase: 'Could you send me the address, please?', translation: 'Не могли бы вы прислать мне адрес?', slotValue: 'send me the address' },
      { id: 'show-way', situation: 'Попроси показать дорогу.', phrase: 'Could you show me the way, please?', translation: 'Не могли бы вы показать мне дорогу?', slotValue: 'show me the way' },
      { id: 'wait', situation: 'Попроси немного подождать.', phrase: 'Could you wait a moment, please?', translation: 'Не могли бы вы немного подождать?', slotValue: 'wait a moment' },
    ],
  },
];

export function createPatternAudioScript(pattern: PhrasePattern) {
  return [
    `Today's pattern is: ${pattern.frame.replace('[action]', 'an action')}.`,
    'Listen and repeat each request.',
    ...pattern.examples.flatMap((example) => [example.phrase, example.phrase]),
  ].join(' ');
}
