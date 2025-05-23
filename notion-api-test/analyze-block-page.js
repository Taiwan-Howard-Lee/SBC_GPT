/**
 * Analyze a specific block page
 * 
 * This script analyzes the content of a specific block page
 * to understand its structure and content.
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for better console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Choose a page with a good number of blocks to analyze
// Let's pick the one with the most blocks
const pageId = '26437b85-3619-4776-a09c-ebcd042319f9'; // 48 blocks

// Load the page data
const pagePath = path.join(__dirname, 'notion-data', 'block-pages', `page-${pageId}.json`);
const pageData = require(pagePath);

console.log(`${colors.magenta}Analyzing Block Page: ${pageId}${colors.reset}\n`);

// Display page info
console.log(`${colors.cyan}Page Information:${colors.reset}`);
console.log(`ID: ${pageData.page.id}`);
console.log(`Created: ${new Date(pageData.page.created_time).toLocaleString()}`);
console.log(`Last Edited: ${new Date(pageData.page.last_edited_time).toLocaleString()}`);
console.log(`Parent Block: ${pageData.page.parent.block_id}`);

// Display properties
console.log(`\n${colors.cyan}Page Properties:${colors.reset}`);
for (const [key, value] of Object.entries(pageData.page.properties)) {
  console.log(`${colors.yellow}${key}:${colors.reset} ${JSON.stringify(value).substring(0, 100)}...`);
}

// Count block types
const blockTypes = {};
pageData.blocks.forEach(block => {
  blockTypes[block.type] = (blockTypes[block.type] || 0) + 1;
});

console.log(`\n${colors.cyan}Block Types (${pageData.blocks.length} total):${colors.reset}`);
for (const [type, count] of Object.entries(blockTypes)) {
  console.log(`${type}: ${count}`);
}

// Display blocks with content
console.log(`\n${colors.cyan}Blocks with Content:${colors.reset}`);
pageData.blocks.forEach((block, index) => {
  let content = '';
  
  if (block.type === 'paragraph' && block.paragraph.rich_text.length > 0) {
    content = block.paragraph.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'heading_1' && block.heading_1.rich_text.length > 0) {
    content = block.heading_1.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'heading_2' && block.heading_2.rich_text.length > 0) {
    content = block.heading_2.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'heading_3' && block.heading_3.rich_text.length > 0) {
    content = block.heading_3.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'bulleted_list_item' && block.bulleted_list_item.rich_text.length > 0) {
    content = block.bulleted_list_item.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'numbered_list_item' && block.numbered_list_item.rich_text.length > 0) {
    content = block.numbered_list_item.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'to_do' && block.to_do.rich_text.length > 0) {
    content = `[${block.to_do.checked ? 'x' : ' '}] ${block.to_do.rich_text.map(t => t.plain_text).join('')}`;
  } else if (block.type === 'toggle' && block.toggle.rich_text.length > 0) {
    content = block.toggle.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'quote' && block.quote.rich_text.length > 0) {
    content = block.quote.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'callout' && block.callout.rich_text.length > 0) {
    content = block.callout.rich_text.map(t => t.plain_text).join('');
  } else if (block.type === 'code' && block.code.rich_text.length > 0) {
    content = `${block.code.language}: ${block.code.rich_text.map(t => t.plain_text).join('')}`;
  } else if (block.type === 'child_page') {
    content = `Child Page: ${block.child_page.title}`;
  } else if (block.type === 'child_database') {
    content = `Child Database: ${block.child_database.title}`;
  } else if (block.type === 'image') {
    content = `Image: ${block.image.type === 'external' ? block.image.external.url : block.image.file.url}`;
  } else if (block.type === 'video') {
    content = `Video: ${block.video.type === 'external' ? block.video.external.url : block.video.file.url}`;
  } else if (block.type === 'file') {
    content = `File: ${block.file.type === 'external' ? block.file.external.url : block.file.file.url}`;
  } else if (block.type === 'pdf') {
    content = `PDF: ${block.pdf.type === 'external' ? block.pdf.external.url : block.pdf.file.url}`;
  } else if (block.type === 'bookmark') {
    content = `Bookmark: ${block.bookmark.url}`;
  } else if (block.type === 'embed') {
    content = `Embed: ${block.embed.url}`;
  } else if (block.type === 'link_preview') {
    content = `Link Preview: ${block.link_preview.url}`;
  } else if (block.type === 'table') {
    content = `Table with ${block.table.table_width} columns`;
  } else if (block.type === 'column_list') {
    content = 'Column List';
  } else if (block.type === 'column') {
    content = 'Column';
  } else if (block.type === 'divider') {
    content = '---';
  } else if (block.type === 'equation') {
    content = `Equation: ${block.equation.expression}`;
  } else if (block.type === 'table_of_contents') {
    content = 'Table of Contents';
  } else if (block.type === 'breadcrumb') {
    content = 'Breadcrumb';
  } else if (block.type === 'template') {
    content = 'Template';
  } else if (block.type === 'link_to_page') {
    content = `Link to Page: ${block.link_to_page.page_id || block.link_to_page.database_id}`;
  } else if (block.type === 'synced_block') {
    content = 'Synced Block';
  } else if (block.type === 'table_row') {
    content = 'Table Row';
  } else if (block.type === 'unsupported') {
    content = 'Unsupported Block';
  }
  
  if (content) {
    console.log(`${colors.yellow}Block ${index + 1} (${block.type}):${colors.reset} ${content}`);
  }
});

// Load the parent block
const parentBlockId = pageData.page.parent.block_id;
const parentBlockPath = path.join(__dirname, 'notion-data', 'block-pages', `parent-block-${parentBlockId}.json`);
const parentBlock = require(parentBlockPath);

console.log(`\n${colors.cyan}Parent Block Information:${colors.reset}`);
console.log(`Type: ${parentBlock.type}`);
console.log(`Created: ${new Date(parentBlock.created_time).toLocaleString()}`);
console.log(`Last Edited: ${new Date(parentBlock.last_edited_time).toLocaleString()}`);

if (parentBlock.type === 'paragraph' && parentBlock.paragraph.rich_text.length > 0) {
  const text = parentBlock.paragraph.rich_text.map(t => t.plain_text).join('');
  console.log(`Content: ${text}`);
} else if (parentBlock.type === 'bulleted_list_item' && parentBlock.bulleted_list_item.rich_text.length > 0) {
  const text = parentBlock.bulleted_list_item.rich_text.map(t => t.plain_text).join('');
  console.log(`Content: ${text}`);
} else {
  console.log(`Content: ${JSON.stringify(parentBlock[parentBlock.type]).substring(0, 100)}...`);
}
