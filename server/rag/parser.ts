// RAG Pipeline for Mashroo3k Chatbot

import fs from 'fs';
import path from 'path';

export interface ChunkMetadata {
  chunk_id: string;
  source_file_name: string;
  parent_section: string;
  section_title: string;
  chunk_text: string;
  keywords?: string[];
  language?: string;
  order_index: number;
}

const normalizeArabicText = (text: string): string => {
  if (!text) return '';
  // Normalize Arabic numerals to English numerals
  const arabicNumbers = [
    /٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g
  ];
  let normalized = text;
  arabicNumbers.forEach((regex, index) => {
    normalized = normalized.replace(regex, index.toString());
  });

  // Remove multiple empty lines and excessive spaces
  normalized = normalized.replace(/ +/g, ' ').replace(/\n{3,}/g, '\n\n');
  return normalized.trim();
};

export const parseMarkdownDocument = (filePath: string): ChunkMetadata[] => {
  const content = fs.readFileSync(filePath, 'utf-8');
  const normalizedContent = normalizeArabicText(content);
  
  const lines = normalizedContent.split('\n');
  
  let currentParentSection = 'عام';
  let currentSectionTitle = 'نبذة عامة';
  
  // We'll accumulate lines until we hit ~1000 characters (approx 200-250 tokens in arabic).
  const MAX_CHUNK_LENGTH = 1200;
  const MIN_CHUNK_LENGTH = 300; // minimum to avoid orphan small chunks
  const OVERLAP = 300; 

  const chunks: ChunkMetadata[] = [];
  let chunkBuffer: string[] = [];
  let chunkLen = 0;
  let orderIndex = 0;

  const flushBuffer = () => {
    if (chunkBuffer.length === 0) return;
    
    let text = chunkBuffer.join('\n').trim();
    if (text.length > 0) {
      chunks.push({
        chunk_id: `chunk_${orderIndex++}_${Date.now()}`,
        source_file_name: path.basename(filePath),
        parent_section: currentParentSection,
        section_title: currentSectionTitle,
        chunk_text: text,
        order_index: orderIndex,
        language: 'ar'
      });
    }

    // Keep overlap. We keep the last few lines that sum to ~OVERLAP characters
    let overlapLen = 0;
    let newBuffer: string[] = [];
    for (let i = chunkBuffer.length - 1; i >= 0; i--) {
      overlapLen += chunkBuffer[i].length + 1;
      newBuffer.unshift(chunkBuffer[i]);
      if (overlapLen > OVERLAP) break;
    }
    // Only overlap if we actually flushed a large chunk, if we barely had enough, overlap might just be the whole chunk 
    // to prevent infinite loop we clear if newBuffer contains all logic
    if (newBuffer.length === chunkBuffer.length) {
      chunkBuffer = [];
      chunkLen = 0;
    } else {
      chunkBuffer = newBuffer;
      chunkLen = overlapLen;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect Parent Sections (e.g. # __١. نبذة عامة__)
    if (line.startsWith('# ')) {
      // Before switching section, flush current buffer
      flushBuffer();
      // Don't keep overlap across sections!
      chunkBuffer = [];
      chunkLen = 0;

      let rawTitle = line.replace(/#/g, '').replace(/_/g, '').trim();
      currentParentSection = rawTitle;
      currentSectionTitle = rawTitle;
      
      chunkBuffer.push(line);
      chunkLen += line.length + 1;
    }
    // Detect Sub Sections (e.g. ## __أ. الاستشارات الإدارية__)
    else if (line.startsWith('## ')) {
      flushBuffer();
      chunkBuffer = [];
      chunkLen = 0;

      let rawTitle = line.replace(/#/g, '').replace(/_/g, '').trim();
      currentSectionTitle = rawTitle;
      
      chunkBuffer.push(line);
      chunkLen += line.length + 1;
    }
    // Normal text
    else {
      chunkBuffer.push(line);
      chunkLen += line.length + 1;
      
      if (chunkLen >= MAX_CHUNK_LENGTH) {
        flushBuffer();
      }
    }
  }

  // Flush remaining
  flushBuffer();

  return chunks;
};
