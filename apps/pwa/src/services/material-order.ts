export interface DatedMaterial {
  addedAt: string;
}

export function sortMaterialsNewestFirst<T extends DatedMaterial>(materials: readonly T[]): T[] {
  return materials
    .map((material, index) => ({ material, index }))
    .sort((left, right) => (
      right.material.addedAt.localeCompare(left.material.addedAt)
      || left.index - right.index
    ))
    .map(({ material }) => material);
}
