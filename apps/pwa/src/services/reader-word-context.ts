const coarseWords: Record<string, { label: string; closerTranslation: string }> = {
  bullshit: { label: 'Грубое слово', closerTranslation: '«херня», «пиздёж» (по контексту); «чушь» смягчает тон' },
  shit: { label: 'Ругательство', closerTranslation: '«дерьмо», «чёрт» (по контексту)' },
  fuck: { label: 'Сильное ругательство', closerTranslation: 'Значение зависит от фразы; вежливым словом не считается' },
  fucking: { label: 'Сильное ругательство', closerTranslation: 'Грубое усиление; нейтральный перевод смягчает тон' },
  asshole: { label: 'Грубое оскорбление', closerTranslation: '«мудак»; неуместно в вежливой речи' },
  bastard: { label: 'Оскорбление', closerTranslation: '«ублюдок», «сволочь» (по контексту)' },
};

export function readerWordContext(text: string) {
  const normalized = text.trim().toLocaleLowerCase('en');
  const warning = coarseWords[normalized];
  return {
    warning,
    reversoUrl: `https://context.reverso.net/translation/english-russian/${encodeURIComponent(text.trim())}`,
  };
}
