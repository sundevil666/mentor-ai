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
  {
    id: 'i-want-you-to',
    title: 'I want you to …',
    frame: 'I want you to [action].',
    prefix: 'I want you to',
    suffix: '.',
    description: 'A reusable pattern for saying clearly what you want another person to do.',
    level: 'A2',
    estimatedMinutes: 15,
    examples: [
      { id: 'listen-carefully', situation: 'Скажи, что хочешь, чтобы тебя внимательно выслушали.', phrase: 'I want you to listen carefully.', translation: 'Я хочу, чтобы ты внимательно выслушал.', slotValue: 'listen carefully' },
      { id: 'tell-truth', situation: 'Скажи, что хочешь услышать правду.', phrase: 'I want you to tell me the truth.', translation: 'Я хочу, чтобы ты сказал мне правду.', slotValue: 'tell me the truth' },
      { id: 'call-arrive', situation: 'Попроси позвонить по приезде.', phrase: 'I want you to call me when you arrive.', translation: 'Я хочу, чтобы ты позвонил мне, когда приедешь.', slotValue: 'call me when you arrive' },
      { id: 'check-report', situation: 'На работе попроси проверить отчёт ещё раз.', phrase: 'I want you to check the report again.', translation: 'Я хочу, чтобы ты ещё раз проверил отчёт.', slotValue: 'check the report again' },
      { id: 'finish-today', situation: 'Скажи коллеге, что задачу нужно закончить сегодня.', phrase: 'I want you to finish this task today.', translation: 'Я хочу, чтобы ты закончил эту задачу сегодня.', slotValue: 'finish this task today' },
      { id: 'send-details', situation: 'Попроси прислать все детали письмом.', phrase: 'I want you to send me all the details by email.', translation: 'Я хочу, чтобы ты прислал мне все детали по электронной почте.', slotValue: 'send me all the details by email' },
      { id: 'show-problem', situation: 'Попроси показать, где именно возникла проблема.', phrase: 'I want you to show me where the problem is.', translation: 'Я хочу, чтобы ты показал мне, где именно проблема.', slotValue: 'show me where the problem is' },
      { id: 'explain-decision', situation: 'Попроси объяснить причину решения.', phrase: 'I want you to explain why you made that decision.', translation: 'Я хочу, чтобы ты объяснил, почему принял такое решение.', slotValue: 'explain why you made that decision' },
      { id: 'wait-outside', situation: 'Попроси подождать снаружи несколько минут.', phrase: 'I want you to wait outside for a few minutes.', translation: 'Я хочу, чтобы ты подождал снаружи несколько минут.', slotValue: 'wait outside for a few minutes' },
      { id: 'come-with-me', situation: 'Скажи, что хочешь, чтобы человек пошёл с тобой.', phrase: 'I want you to come with me.', translation: 'Я хочу, чтобы ты пошёл со мной.', slotValue: 'come with me' },
      { id: 'meet-station', situation: 'Попроси встретить тебя на вокзале.', phrase: 'I want you to meet me at the station.', translation: 'Я хочу, чтобы ты встретил меня на вокзале.', slotValue: 'meet me at the station' },
      { id: 'book-table', situation: 'Попроси забронировать столик на вечер.', phrase: 'I want you to book a table for tonight.', translation: 'Я хочу, чтобы ты забронировал столик на сегодняшний вечер.', slotValue: 'book a table for tonight' },
      { id: 'ask-manager', situation: 'Попроси поговорить с менеджером.', phrase: 'I want you to ask the manager about it.', translation: 'Я хочу, чтобы ты спросил об этом менеджера.', slotValue: 'ask the manager about it' },
      { id: 'keep-receipt', situation: 'Напомни сохранить чек.', phrase: 'I want you to keep the receipt.', translation: 'Я хочу, чтобы ты сохранил чек.', slotValue: 'keep the receipt' },
      { id: 'speak-english', situation: 'Скажи, что хочешь практиковать английский дома.', phrase: 'I want you to speak English with me at home.', translation: 'Я хочу, чтобы ты говорил со мной по-английски дома.', slotValue: 'speak English with me at home' },
      { id: 'correct-mistakes', situation: 'Попроси исправлять твои ошибки.', phrase: 'I want you to correct me when I make a mistake.', translation: 'Я хочу, чтобы ты исправлял меня, когда я ошибаюсь.', slotValue: 'correct me when I make a mistake' },
      { id: 'watch-film', situation: 'Предложи посмотреть этот фильм вместе.', phrase: 'I want you to watch this film with me.', translation: 'Я хочу, чтобы ты посмотрел этот фильм вместе со мной.', slotValue: 'watch this film with me' },
      { id: 'remember-name', situation: 'Скажи, что важно запомнить это имя.', phrase: 'I want you to remember this name.', translation: 'Я хочу, чтобы ты запомнил это имя.', slotValue: 'remember this name' },
      { id: 'leave-alone', situation: 'Скажи, что хочешь немного побыть один.', phrase: 'I want you to leave me alone for a while.', translation: 'Я хочу, чтобы ты оставил меня одного на некоторое время.', slotValue: 'leave me alone for a while' },
      { id: 'be-careful', situation: 'Попроси быть осторожнее по дороге домой.', phrase: 'I want you to be careful on your way home.', translation: 'Я хочу, чтобы ты был осторожен по дороге домой.', slotValue: 'be careful on your way home' },
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
