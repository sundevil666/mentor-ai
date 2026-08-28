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
    estimatedMinutes: 15,
    examples: [
      { id: 'help', situation: 'Попроси помочь тебе с этим.', phrase: 'Could you help me with this, please?', translation: 'Не могли бы вы помочь мне с этим?', slotValue: 'help me with this' },
      { id: 'repeat', situation: 'Попроси повторить сказанное.', phrase: 'Could you repeat that, please?', translation: 'Не могли бы вы повторить?', slotValue: 'repeat that' },
      { id: 'speak-slowly', situation: 'Попроси говорить немного медленнее.', phrase: 'Could you speak a little more slowly, please?', translation: 'Не могли бы вы говорить немного медленнее?', slotValue: 'speak a little more slowly' },
      { id: 'send-address', situation: 'Попроси прислать адрес.', phrase: 'Could you send me the address, please?', translation: 'Не могли бы вы прислать мне адрес?', slotValue: 'send me the address' },
      { id: 'show-way', situation: 'Попроси показать дорогу.', phrase: 'Could you show me the way, please?', translation: 'Не могли бы вы показать мне дорогу?', slotValue: 'show me the way' },
      { id: 'wait', situation: 'Попроси немного подождать.', phrase: 'Could you wait a moment, please?', translation: 'Не могли бы вы немного подождать?', slotValue: 'wait a moment' },
      { id: 'write-down', situation: 'Попроси записать это.', phrase: 'Could you write that down, please?', translation: 'Не могли бы вы это записать?', slotValue: 'write that down' },
      { id: 'spell', situation: 'Попроси произнести слово по буквам.', phrase: 'Could you spell that, please?', translation: 'Не могли бы вы произнести это по буквам?', slotValue: 'spell that' },
      { id: 'explain', situation: 'Попроси объяснить это ещё раз.', phrase: 'Could you explain that again, please?', translation: 'Не могли бы вы объяснить это ещё раз?', slotValue: 'explain that again' },
      { id: 'show-how', situation: 'Попроси показать, как это работает.', phrase: 'Could you show me how this works, please?', translation: 'Не могли бы вы показать мне, как это работает?', slotValue: 'show me how this works' },
      { id: 'check', situation: 'Попроси проверить это для тебя.', phrase: 'Could you check this for me, please?', translation: 'Не могли бы вы проверить это для меня?', slotValue: 'check this for me' },
      { id: 'call-later', situation: 'Попроси перезвонить позже.', phrase: 'Could you call me back later, please?', translation: 'Не могли бы вы перезвонить мне позже?', slotValue: 'call me back later' },
      { id: 'let-know', situation: 'Попроси сообщить, когда всё будет готово.', phrase: 'Could you let me know when it is ready, please?', translation: 'Не могли бы вы сообщить мне, когда всё будет готово?', slotValue: 'let me know when it is ready' },
      { id: 'open-window', situation: 'Попроси открыть окно.', phrase: 'Could you open the window, please?', translation: 'Не могли бы вы открыть окно?', slotValue: 'open the window' },
      { id: 'close-door', situation: 'Попроси закрыть дверь.', phrase: 'Could you close the door, please?', translation: 'Не могли бы вы закрыть дверь?', slotValue: 'close the door' },
      { id: 'turn-down', situation: 'Попроси сделать музыку потише.', phrase: 'Could you turn the music down, please?', translation: 'Не могли бы вы сделать музыку потише?', slotValue: 'turn the music down' },
      { id: 'photo', situation: 'Попроси сфотографировать вас.', phrase: 'Could you take a photo of us, please?', translation: 'Не могли бы вы нас сфотографировать?', slotValue: 'take a photo of us' },
      { id: 'menu', situation: 'Попроси принести меню.', phrase: 'Could you bring me the menu, please?', translation: 'Не могли бы вы принести мне меню?', slotValue: 'bring me the menu' },
      { id: 'restroom', situation: 'Попроси подсказать, где находится туалет.', phrase: 'Could you tell me where the restroom is, please?', translation: 'Не могли бы вы подсказать, где находится туалет?', slotValue: 'tell me where the restroom is' },
      { id: 'hold', situation: 'Попроси немного подержать вещь.', phrase: 'Could you hold this for a moment, please?', translation: 'Не могли бы вы немного подержать это?', slotValue: 'hold this for a moment' },
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
