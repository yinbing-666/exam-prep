// 文件解析层：PDF/DOCX/TXT/MD/PPTX → 纯文本
// 所有解析在浏览器端完成，不上传服务器

import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { parse as parsePptx } from 'pptxtojson';

// pdfjs worker配置
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export interface ParsedFile {
  title: string;
  content: string;
  kind: 'pdf' | 'docx' | 'txt' | 'md' | 'pptx';
  pageCount?: number;
  charCount: number;
}

// 解析PDF
async function parsePDF(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const texts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str)
      .join(' ');
    if (pageText.trim()) texts.push(pageText);
  }

  return {
    title: file.name.replace(/\.pdf$/i, ''),
    content: texts.join('\n\n'),
    kind: 'pdf',
    pageCount: pdf.numPages,
    charCount: texts.join('').length,
  };
}

// 解析DOCX
async function parseDOCX(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });

  return {
    title: file.name.replace(/\.docx$/i, ''),
    content: result.value,
    kind: 'docx',
    charCount: result.value.length,
  };
}

// 解析TXT/MD
async function parseText(file: File): Promise<ParsedFile> {
  const text = await file.text();
  const kind = file.name.endsWith('.md') ? 'md' : 'txt';

  return {
    title: file.name.replace(/\.(txt|md)$/i, ''),
    content: text,
    kind,
    charCount: text.length,
  };
}

// 解析PPTX
async function parsePPTX(file: File): Promise<ParsedFile> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await parsePptx(arrayBuffer, { imageMode: 'none', videoMode: 'none', audioMode: 'none' });
  
  const slideTexts: string[] = [];
  for (let i = 0; i < result.slides.length; i++) {
    const slide = result.slides[i];
    const texts: string[] = [];
    
    // 提取所有文本元素
    for (const el of slide.elements) {
      if ('content' in el && typeof el.content === 'string' && el.content.trim()) {
        texts.push(el.content.trim());
      }
    }
    
    // 也检查布局元素
    for (const el of slide.layoutElements || []) {
      if ('content' in el && typeof el.content === 'string' && el.content.trim()) {
        texts.push(el.content.trim());
      }
    }
    
    // 提取备注
    if (slide.note && slide.note.trim()) {
      texts.push(`[备注] ${slide.note.trim()}`);
    }
    
    if (texts.length > 0) {
      slideTexts.push(`--- 第${i + 1}页 ---\n${texts.join('\n')}`);
    }
  }

  const content = slideTexts.join('\n\n');

  return {
    title: file.name.replace(/\.pptx$/i, ''),
    content,
    kind: 'pptx',
    pageCount: result.slides.length,
    charCount: content.length,
  };
}

// 统一入口
export async function parseFile(file: File): Promise<ParsedFile> {
  const ext = file.name.toLowerCase();

  if (ext.endsWith('.pdf')) return parsePDF(file);
  if (ext.endsWith('.docx')) return parseDOCX(file);
  if (ext.endsWith('.txt') || ext.endsWith('.md')) return parseText(file);
  if (ext.endsWith('.pptx')) return parsePPTX(file);

  throw new Error(`不支持的文件格式：${file.name}。支持 PDF/DOCX/PPTX/TXT/MD`);
}

// 获取支持的文件类型提示
export const ACCEPTED_TYPES = '.pdf,.docx,.pptx,.txt,.md';
