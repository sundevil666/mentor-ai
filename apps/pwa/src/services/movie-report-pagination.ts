export function visibleMovieReportPages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: Math.max(0, totalPages) }, (_, index) => index + 1);
  const middleStart = Math.min(Math.max(currentPage - 1, 2), totalPages - 3);
  return [1, middleStart, middleStart + 1, middleStart + 2, totalPages];
}
