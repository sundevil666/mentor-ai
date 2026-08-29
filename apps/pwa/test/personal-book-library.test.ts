import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strToU8, zipSync } from 'fflate';
import { buildEpubBook, buildPlainTextBook, createFallbackPersonalBookSource, normalizePersonalBookArchive, resolveArchivePath, splitPlainTextIntoChapters } from '../src/services/personal-book-library.js';

describe('personal book library', () => {
  it('splits large plain text at paragraph boundaries', () => {
    const sections = splitPlainTextIntoChapters('One two three.\n\nFour five six.\n\nSeven eight nine.', 5);
    assert.deepEqual(sections, [
      { title: 'Part 1', text: 'One two three.' },
      { title: 'Part 2', text: 'Four five six.' },
      { title: 'Part 3', text: 'Seven eight nine.' },
    ]);
  });

  it('creates private reading records for a text file', () => {
    const imported = buildPlainTextBook('First paragraph.\n\nSecond paragraph.', 'My Book.txt');
    assert.equal(imported.book.title, 'My Book');
    assert.equal(imported.book.format, 'txt');
    assert.equal(imported.book.rightsConfirmed, true);
    assert.equal(imported.book.chapterCount, 1);
    assert.equal(imported.book.wordCount, 4);
    assert.equal(imported.pages[0]?.text, 'First paragraph.\nSecond paragraph.');
  });

  it('collapses repeated line and paragraph breaks for new imports', () => {
    const imported = buildPlainTextBook('First.\r\n\r\n\r\n   Second.\n\nThird.', 'spacing.txt');
    assert.equal(imported.pages[0]?.text, 'First.\nSecond.\nThird.');
  });

  it('normalizes pages from books saved by an older app version', () => {
    const imported = buildPlainTextBook('First.\nSecond.', 'legacy.txt');
    const legacy = {
      ...imported,
      book: { ...imported.book, wordCount: 99, updatedAt: '2026-01-01T00:00:00.000Z' },
      pages: [{ ...imported.pages[0]!, text: 'First.\n\n\nSecond.', wordCount: 99 }],
    };
    const normalized = normalizePersonalBookArchive(legacy);
    assert.equal(normalized.pages[0]?.text, 'First.\nSecond.');
    assert.equal(normalized.pages[0]?.wordCount, 2);
    assert.equal(normalized.book.wordCount, 2);
    assert.notEqual(normalized.book.updatedAt, legacy.book.updatedAt);
  });

  it('reconstructs source metadata for books imported by an older app version', () => {
    const imported = buildPlainTextBook('A legacy local book.', 'legacy.txt');
    assert.deepEqual(createFallbackPersonalBookSource(imported.book), {
      id: imported.book.sourceId,
      type: 'manual',
      provider: 'student-device',
      importedAt: imported.book.importedAt,
      licenseNote: 'Student confirmed a lawful private copy.',
    });
  });

  it('resolves EPUB package paths without escaping the archive', () => {
    assert.equal(resolveArchivePath('OPS/package/', '../chapters/one.xhtml'), 'OPS/chapters/one.xhtml');
    assert.equal(resolveArchivePath('', '../../chapter.xhtml'), 'chapter.xhtml');
  });

  it('imports readable EPUB spine documents in order', () => {
    const archive = zipSync({
      mimetype: strToU8('application/epub+zip'),
      'META-INF/container.xml': strToU8('<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/content.opf"/></rootfiles></container>'),
      'OPS/content.opf': strToU8(`<?xml version="1.0"?>
        <package xmlns:dc="http://purl.org/dc/elements/1.1/">
          <metadata><dc:title>Test Story</dc:title><dc:creator>Test Author</dc:creator></metadata>
          <manifest>
            <item id="first" href="text/first.xhtml" media-type="application/xhtml+xml"/>
            <item id="second" href="text/second.xhtml" media-type="application/xhtml+xml"/>
          </manifest>
          <spine><itemref idref="first"/><itemref idref="second"/></spine>
        </package>`),
      'OPS/text/first.xhtml': strToU8('<html><head><title>Opening</title></head><body><h1>Opening</h1><p>Hello reader.</p></body></html>'),
      'OPS/text/second.xhtml': strToU8('<html><head><title>Next</title></head><body><h1>Next</h1><p>The story continues.</p></body></html>'),
    });
    const imported = buildEpubBook(archive, 'test.epub');
    assert.equal(imported.book.title, 'Test Story');
    assert.equal(imported.book.author, 'Test Author');
    assert.deepEqual(imported.chapters.map((chapter) => chapter.title), ['Opening', 'Next']);
    assert.match(imported.pages[0]?.text ?? '', /Hello reader/);
    assert.match(imported.pages[1]?.text ?? '', /story continues/);
  });
});
