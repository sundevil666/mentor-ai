import type { PersonalReadingBook, PersonalReadingBookArchive, ReadingChapter, ReadingImportSource, ReadingPage } from '@mentor-ai/shared';
import { strFromU8, unzipSync } from 'fflate';

export type PersonalBookFormat = 'epub' | 'txt';

export type PersonalBook = PersonalReadingBook;

export interface ImportedPersonalBook {
  source: ReadingImportSource;
  book: PersonalBook;
  chapters: ReadingChapter[];
  pages: ReadingPage[];
}

const maxImportBytes = 30 * 1024 * 1024;
const maxExtractedBytes = 80 * 1024 * 1024;

export async function importPersonalBook(file: File): Promise<PersonalBook> {
  if (file.size > maxImportBytes) throw new Error('This book is larger than the 30 MB import limit.');
  const extension = file.name.split('.').pop()?.toLowerCase();
  let imported: ImportedPersonalBook;

  if (extension === 'txt' || file.type === 'text/plain') {
    imported = buildPlainTextBook(await file.text(), file.name);
  } else if (extension === 'epub' || file.type === 'application/epub+zip') {
    imported = buildEpubBook(new Uint8Array(await file.arrayBuffer()), file.name);
  } else {
    throw new Error('Choose a DRM-free EPUB or UTF-8 TXT file.');
  }

  await saveImportedBook(imported);
  return imported.book;
}

export function buildPlainTextBook(text: string, fileName: string): ImportedPersonalBook {
  const normalized = normalizeText(text);
  if (!normalized) throw new Error('This text file does not contain readable text.');
  const title = fileName.replace(/\.[^.]+$/, '').trim() || 'Imported book';
  const sections = splitPlainTextIntoChapters(normalized);
  return buildRecords({ title, fileName, format: 'txt', sections });
}

export function splitPlainTextIntoChapters(text: string, targetWords = 1_200): Array<{ title: string; text: string }> {
  const paragraphs = normalizeText(text).split(/\n{2,}/).filter(Boolean);
  const sections: Array<{ title: string; text: string }> = [];
  let current: string[] = [];
  let wordCount = 0;

  for (const paragraph of paragraphs) {
    const paragraphWords = countWords(paragraph);
    if (current.length > 0 && wordCount + paragraphWords > targetWords) {
      sections.push({ title: `Part ${sections.length + 1}`, text: current.join('\n\n') });
      current = [];
      wordCount = 0;
    }
    current.push(paragraph);
    wordCount += paragraphWords;
  }

  if (current.length > 0) sections.push({ title: `Part ${sections.length + 1}`, text: current.join('\n\n') });
  return sections;
}

export function buildEpubBook(bytes: Uint8Array, fileName: string): ImportedPersonalBook {
  let archive: Record<string, Uint8Array>;
  let declaredBytes = 0;
  try {
    archive = unzipSync(bytes, {
      filter: (entry) => {
        if (entry.name.startsWith('__MACOSX/')) return false;
        declaredBytes += entry.originalSize;
        if (declaredBytes > maxExtractedBytes) throw new Error('epub-size-limit');
        return true;
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'epub-size-limit') {
      throw new Error('This EPUB expands beyond the 80 MB safety limit.');
    }
    throw new Error('This EPUB could not be opened. It may be damaged or protected.');
  }

  const extractedBytes = Object.values(archive).reduce((sum, item) => sum + item.byteLength, 0);
  if (extractedBytes > maxExtractedBytes) throw new Error('This EPUB expands beyond the 80 MB safety limit.');

  const container = readArchiveText(archive, 'META-INF/container.xml');
  const packagePath = firstAttribute(container, 'rootfile', 'full-path');
  if (!packagePath) throw new Error('This EPUB does not contain a readable package document.');
  const packageDocument = readArchiveText(archive, packagePath);
  const packageDirectory = packagePath.includes('/') ? packagePath.slice(0, packagePath.lastIndexOf('/') + 1) : '';
  const title = firstElementText(packageDocument, 'title') || fileName.replace(/\.[^.]+$/, '') || 'Imported book';
  const author = firstElementText(packageDocument, 'creator') || undefined;
  const manifest = new Map<string, string>();

  for (const item of elements(packageDocument, 'item')) {
    const id = attribute(item, 'id');
    const href = attribute(item, 'href');
    const mediaType = attribute(item, 'media-type');
    if (id && href && (mediaType.includes('xhtml') || mediaType.includes('html'))) {
      manifest.set(id, resolveArchivePath(packageDirectory, decodeURIComponent(href.split('#')[0] ?? href)));
    }
  }

  const sections: Array<{ title: string; text: string }> = [];
  for (const itemref of elements(packageDocument, 'itemref')) {
    const idref = attribute(itemref, 'idref');
    const contentPath = manifest.get(idref);
    if (!contentPath || !archive[contentPath]) continue;
    const document = readArchiveText(archive, contentPath);
    const text = extractDocumentText(document);
    if (!text) continue;
    sections.push({
      title: firstElementText(document, 'title') || firstElementText(document, 'h1') || firstElementText(document, 'h2') || `Chapter ${sections.length + 1}`,
      text,
    });
  }

  if (sections.length === 0) throw new Error('No readable chapters were found in this EPUB.');
  return buildRecords({ title, author, fileName, format: 'epub', sections });
}

export async function listPersonalBooks(): Promise<PersonalBook[]> {
  const db = await getMentorDb();
  const books = await db.getAll('reading-books') as PersonalBook[];
  return books
    .filter((book) => book && (book.format === 'epub' || book.format === 'txt'))
    .sort((left, right) => (right.lastOpenedAt ?? right.importedAt).localeCompare(left.lastOpenedAt ?? left.importedAt));
}

export async function listPersonalBookArchives(): Promise<PersonalReadingBookArchive[]> {
  const books = await listPersonalBooks();
  const archives = await Promise.all(books.map((book) => loadPersonalBook(book.id)));
  return archives.filter((archive): archive is PersonalReadingBookArchive => archive !== null);
}

export function createFallbackPersonalBookSource(book: PersonalBook): ReadingImportSource {
  return {
    id: book.sourceId,
    type: 'manual',
    provider: 'student-device',
    importedAt: book.importedAt,
    licenseNote: 'Student confirmed a lawful private copy.',
  };
}

export async function mergePersonalBookArchives(archives: PersonalReadingBookArchive[]): Promise<void> {
  for (const archive of archives) {
    if (!archive?.book?.id || archive.book.rightsConfirmed !== true) continue;
    const local = await loadPersonalBook(archive.book.id);
    if (local && local.book.updatedAt > archive.book.updatedAt) continue;
    await saveImportedBook(archive);
  }
}

export async function loadPersonalBook(bookId: string): Promise<PersonalReadingBookArchive | null> {
  const db = await getMentorDb();
  const book = await db.get('reading-books', bookId) as PersonalBook | undefined;
  if (!book) return null;
  const storedSource = await db.get('reading-sources', book.sourceId) as ReadingImportSource | undefined;
  const source = storedSource ?? createFallbackPersonalBookSource(book);
  const chapters = (await db.getAll('reading-chapters') as ReadingChapter[])
    .filter((chapter) => chapter.bookId === bookId)
    .sort((left, right) => left.order - right.order);
  const pages = (await db.getAll('reading-pages') as ReadingPage[])
    .filter((page) => page.bookId === bookId)
    .sort((left, right) => left.pageNumber - right.pageNumber);
  return { source, book, chapters, pages };
}

export async function markPersonalBookOpened(book: PersonalBook): Promise<void> {
  const db = await getMentorDb();
  await db.put('reading-books', { ...book, lastOpenedAt: new Date().toISOString() });
}

export async function deletePersonalBook(bookId: string): Promise<void> {
  const db = await getMentorDb();
  const transaction = db.transaction(['reading-sources', 'reading-books', 'reading-chapters', 'reading-pages'], 'readwrite');
  const book = await transaction.objectStore('reading-books').get(bookId) as PersonalBook | undefined;
  const chapters = (await transaction.objectStore('reading-chapters').getAll() as ReadingChapter[]).filter((item) => item.bookId === bookId);
  const pages = (await transaction.objectStore('reading-pages').getAll() as ReadingPage[]).filter((item) => item.bookId === bookId);
  await Promise.all([
    transaction.objectStore('reading-books').delete(bookId),
    ...(book ? [transaction.objectStore('reading-sources').delete(book.sourceId)] : []),
    ...chapters.map((item) => transaction.objectStore('reading-chapters').delete(item.id)),
    ...pages.map((item) => transaction.objectStore('reading-pages').delete(item.id)),
  ]);
  await transaction.done;
}

async function saveImportedBook(imported: ImportedPersonalBook | PersonalReadingBookArchive): Promise<void> {
  const db = await getMentorDb();
  const transaction = db.transaction(['reading-sources', 'reading-books', 'reading-chapters', 'reading-pages'], 'readwrite');
  await Promise.all([
    transaction.objectStore('reading-sources').put(imported.source),
    transaction.objectStore('reading-books').put(imported.book),
    ...imported.chapters.map((chapter) => transaction.objectStore('reading-chapters').put(chapter)),
    ...imported.pages.map((page) => transaction.objectStore('reading-pages').put(page)),
  ]);
  await transaction.done;
}

function buildRecords(input: { title: string; author?: string; fileName: string; format: PersonalBookFormat; sections: Array<{ title: string; text: string }> }): ImportedPersonalBook {
  const now = new Date().toISOString();
  const bookId = crypto.randomUUID();
  const sourceId = crypto.randomUUID();
  const pages: ReadingPage[] = input.sections.map((section, index) => ({
    id: `${bookId}:page:${index + 1}`,
    bookId,
    chapterId: `${bookId}:chapter:${index + 1}`,
    pageNumber: index + 1,
    text: section.text,
    wordCount: countWords(section.text),
  }));
  const chapters: ReadingChapter[] = input.sections.map((section, index) => ({
    id: `${bookId}:chapter:${index + 1}`,
    bookId,
    title: section.title,
    order: index,
    pageIds: [pages[index]!.id],
  }));
  const book: PersonalBook = {
    id: bookId,
    title: input.title.trim(),
    author: input.author?.trim(),
    level: 'unknown',
    language: 'en',
    sourceId,
    pageCount: pages.length,
    chapterCount: chapters.length,
    wordCount: pages.reduce((sum, page) => sum + page.wordCount, 0),
    importedAt: now,
    updatedAt: now,
    fileName: input.fileName,
    format: input.format,
    rightsConfirmed: true,
  };
  return {
    source: { id: sourceId, type: 'manual', provider: 'student-device', importedAt: now, licenseNote: 'Student confirmed a lawful private copy.' },
    book,
    chapters,
    pages,
  };
}

function normalizeText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\t\f\v ]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function countWords(value: string): number {
  return value.match(/[\p{L}\p{N}]+(?:[-'’][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

function readArchiveText(archive: Record<string, Uint8Array>, path: string): string {
  const entry = archive[path];
  if (!entry) throw new Error(`Required EPUB file is missing: ${path}`);
  return strFromU8(entry);
}

export function resolveArchivePath(base: string, relative: string): string {
  const parts = `${base}${relative}`.split('/');
  const resolved: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') resolved.pop();
    else resolved.push(part);
  }
  return resolved.join('/');
}

function elements(xml: string, localName: string): string[] {
  const pattern = new RegExp(`<(?:(?:[\\w-]+):)?${localName}\\b[^>]*>`, 'gi');
  return xml.match(pattern) ?? [];
}

function attribute(element: string, name: string): string {
  return element.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'))?.[1]?.trim() ?? '';
}

function firstAttribute(xml: string, elementName: string, attributeName: string): string {
  return attribute(elements(xml, elementName)[0] ?? '', attributeName);
}

function firstElementText(xml: string, localName: string): string {
  const match = xml.match(new RegExp(`<(?:(?:[\\w-]+):)?${localName}\\b[^>]*>([\\s\\S]*?)<\\/(?:(?:[\\w-]+):)?${localName}>`, 'i'));
  return match ? decodeEntities(stripMarkup(match[1] ?? '')).trim() : '';
}

function extractDocumentText(document: string): string {
  const withoutNoise = document
    .replace(/<head\b[\s\S]*?<\/head>/gi, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '')
    .replace(/<svg\b[\s\S]*?<\/svg>/gi, '')
    .replace(/<\/(?:p|div|section|article|blockquote|h[1-6]|li)>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n');
  return normalizeText(decodeEntities(stripMarkup(withoutNoise)));
}

function stripMarkup(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

function decodeEntities(value: string): string {
  if (typeof document !== 'undefined') {
    const element = document.createElement('textarea');
    element.innerHTML = value;
    return element.value;
  }
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

async function getMentorDb() {
  const { mentorDb } = await import('./indexed-db.js');
  return mentorDb;
}
