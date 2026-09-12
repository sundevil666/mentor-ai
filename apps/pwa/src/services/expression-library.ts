export interface EnglishExpression {
  id: string;
  phrase: string;
  meaning: string;
  situation: string;
  insight: string;
}

export const expressionLibrary: EnglishExpression[] = [
  { id: 'way-to-go', phrase: 'Way to go!', meaning: 'Молодец! / Так держать!', situation: 'Кто-то хорошо справился, и ты его хвалишь.', insight: 'Это готовая реакция, а не указание, куда идти.' },
  { id: 'had-it-in-him', phrase: 'I knew he had it in him.', meaning: 'Я знал, что он способен на это.', situation: 'Человек сделал что-то трудное, а ты верил в него заранее.', insight: 'Have it in someone значит иметь нужные силы, характер или способности.' },
  { id: 'hold-on', phrase: 'Hold on.', meaning: 'Подожди. / Секундочку. / Держись.', situation: 'Ты просишь не спешить или остановиться на секунду.', insight: 'Точный смысл даёт ситуация; дословное «держать на» не работает.' },
  { id: 'got-it', phrase: 'Got it.', meaning: 'Понял. / Ясно. / Сделаю.', situation: 'Ты понял объяснение или принимаешь короткое поручение.', insight: 'В разговоре I часто опускается: полная форма — I got it.' },
  { id: 'come-on', phrase: 'Come on!', meaning: 'Давай! / Ну же! / Да ладно!', situation: 'Ты подгоняешь, уговариваешь или не веришь сказанному.', insight: 'Интонация решает, это поддержка, нетерпение или недоверие.' },
  { id: 'kidding-me', phrase: "You've got to be kidding me.", meaning: 'Ты, должно быть, шутишь. / Да вы издеваетесь!', situation: 'Ты поражён или раздражён тем, что только что узнал.', insight: 'Фраза выражает сильное недоверие, а не просьбу пошутить.' },
  { id: 'whats-going-on', phrase: "What's going on?", meaning: 'Что происходит?', situation: 'Ты входишь в непонятную ситуацию и хочешь объяснений.', insight: 'Go on здесь означает происходить или продолжаться.' },
  { id: 'figure-it-out', phrase: "We'll figure it out.", meaning: 'Мы разберёмся. / Мы найдём решение.', situation: 'Решения пока нет, но вы собираетесь его найти.', insight: 'Figure out — понять или найти решение, а не «вычислить наружу».' },
  { id: 'turns-out', phrase: 'It turns out I was wrong.', meaning: 'Оказалось, я был неправ.', situation: 'Новая информация изменила прежнее представление.', insight: 'It turns out вводит результат или неожиданно выяснившийся факт.' },
  { id: 'makes-sense', phrase: 'That makes sense.', meaning: 'Это логично. / Теперь понятно.', situation: 'После объяснения идея стала понятной и связной.', insight: 'Фраза не про создание чувства, а про понятность и логику.' },
  { id: 'up-to-you', phrase: "It's up to you.", meaning: 'Решать тебе. / Выбор за тобой.', situation: 'Ты передаёшь другому человеку право принять решение.', insight: 'Up to здесь не означает физическое направление вверх.' },
  { id: 'my-bad', phrase: 'My bad.', meaning: 'Моя вина. / Это я виноват.', situation: 'Ты неформально признаёшь небольшую ошибку.', insight: 'Короткая разговорная формула; для формальной ситуации лучше My mistake.' },
  { id: 'no-wonder', phrase: 'No wonder he was upset.', meaning: 'Неудивительно, что он расстроился.', situation: 'Причина стала ясна, и реакция человека теперь понятна.', insight: 'No wonder связывает понятную причину с закономерным результатом.' },
  { id: 'give-me-a-break', phrase: 'Give me a break!', meaning: 'Да ладно! / Хватит! / Отстань!', situation: 'Ты раздражён, не веришь или просишь перестать давить на тебя.', insight: 'Обычно это не просьба дать буквальный перерыв.' },
  { id: 'here-we-go', phrase: 'Here we go.', meaning: 'Ну, поехали. / Начинается.', situation: 'Что-то начинается — ожидаемое, трудное или уже знакомое.', insight: 'Интонация может передавать энтузиазм или «ну вот, опять».' },
  { id: 'nailed-it', phrase: 'You nailed it.', meaning: 'Ты отлично справился. / Ты попал в точку.', situation: 'Кто-то сделал или сказал что-то очень точно.', insight: 'Nail здесь означает выполнить идеально, а не забить гвоздь.' },
  { id: 'im-on-it', phrase: "I'm on it.", meaning: 'Я уже занимаюсь этим. / Беру на себя.', situation: 'Ты подтверждаешь, что начинаешь выполнять задачу.', insight: 'Это быстрый ответ на просьбу, а не описание положения сверху.' },
  { id: 'take-your-time', phrase: 'Take your time.', meaning: 'Не торопись.', situation: 'Ты даёшь человеку спокойно закончить без спешки.', insight: 'Фраза разрешает потратить столько времени, сколько нужно.' },
  { id: 'count-on-me', phrase: 'You can count on me.', meaning: 'Ты можешь на меня рассчитывать.', situation: 'Ты обещаешь поддержку или надёжную помощь.', insight: 'Count on someone — доверять и рассчитывать, не считать числа.' },
  { id: 'fair-enough', phrase: 'Fair enough.', meaning: 'Справедливо. / Ладно, принимается.', situation: 'Ты признаёшь, что объяснение или условие разумно.', insight: 'Это спокойное принятие чужой точки зрения, не оценка количества.' },
];

export const expressionPractice: PhrasePattern = {
  id: 'everyday-expressions',
  title: 'Everyday expressions',
  frame: 'Learn each expression as one complete meaning.',
  prefix: '',
  suffix: '',
  description: 'Reactions and conversational chunks that cannot be understood reliably word-for-word.',
  level: 'A2–B1',
  estimatedMinutes: 18,
  examples: expressionLibrary.map((expression) => ({
    id: expression.id,
    situation: expression.situation,
    phrase: expression.phrase,
    translation: expression.meaning,
    slotValue: expression.phrase,
  })),
};
import type { PhrasePattern } from './pattern-library.js';
