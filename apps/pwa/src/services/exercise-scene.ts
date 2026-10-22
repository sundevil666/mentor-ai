/** Generic visual vocabulary; never store personalized lesson text or IDs here. */
export type ExerciseScene = 'help' | 'check' | 'parcel' | 'door' | 'door-open' | 'keys' | 'repair' | 'cafe' | 'wait' | 'relief' | 'explain' | 'traffic' | 'run' | 'phone' | 'tickets';
export function resolveExerciseScene(prompt: string): ExerciseScene | null {
  const rules: Array<[RegExp, ExerciseScene]> = [
    [/беж|побеж|\brun\b|\bran\b/i, 'run'],
    [/откр.{0,12}двер|open.{0,12}door/i, 'door-open'],
    [/ремонт|почин|почини|\brepair\b|\bfixed\b/i, 'repair'],
    [/посыл|достав|package|parcel/i, 'parcel'],
    [/ключ|\bkeys\b/i, 'keys'],
    [/билет|tickets/i, 'tickets'],
    [/пробк|traffic/i, 'traffic'],
    [/позвон|called|\bcall\b/i, 'phone'],
    [/кофе|кафе|счёт|счет|coffee|\bpay\b/i, 'cafe'],
    [/подож|hold on|\bwait\b/i, 'wait'],
    [/облегч|relieved/i, 'relief'],
    [/понима|объясн|understand|explaining/i, 'explain'],
    [/помо|попрос|could you|\bhelp\b/i, 'help'],
    [/провер|ошиб|план|\bcheck|mistake|\bplan\b/i, 'check'],
    [/шум|сосед|neighbour|\bnoise\b/i, 'door'],
  ];
  return rules.find(([pattern]) => pattern.test(prompt))?.[1] ?? null;
}
