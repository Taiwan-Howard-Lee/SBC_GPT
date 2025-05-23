/**
 * Extract and display Notion content
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

// Load the page data
const pagePath = path.join(__dirname, 'notion-data', 'pages', 'untitled_page_a7dafba4-b109-409a-94a6-ce0a0e9e5cb8.json');
const pageData = require(pagePath);

// Load all content data
const allContentPath = path.join(__dirname, 'notion-data', 'all-content.json');
const allContent = require(allContentPath);

console.log(`${colors.magenta}Analyzing Notion Content...${colors.reset}\n`);

// Display page info
console.log(`${colors.cyan}Page Information:${colors.reset}`);
console.log(`Title: ${pageData.page.properties?.title?.title?.[0]?.plain_text || 'Untitled'}`);
console.log(`ID: ${pageData.page.id}`);
console.log(`Created: ${new Date(pageData.page.created_time).toLocaleString()}`);
console.log(`Last Edited: ${new Date(pageData.page.last_edited_time).toLocaleString()}`);
console.log(`URL: ${pageData.page.url || 'No URL available'}`);

// Display properties
console.log(`\n${colors.cyan}Page Properties:${colors.reset}`);
for (const [key, value] of Object.entries(pageData.page.properties)) {
  console.log(`${colors.yellow}${key}:${colors.reset} ${JSON.stringify(value).substring(0, 100)}...`);
}

// Display blocks
console.log(`\n${colors.cyan}Page Content (${pageData.blocks.length} blocks):${colors.reset}`);
pageData.blocks.forEach((block, index) => {
  console.log(`\n${colors.yellow}Block ${index + 1} (${block.type}):${colors.reset}`);
  
  if (block.type === 'paragraph') {
    const text = block.paragraph.rich_text.map(t => t.plain_text).join('');
    console.log(text || '(Empty paragraph)');
  } else if (block.type === 'heading_1') {
    const text = block.heading_1.rich_text.map(t => t.plain_text).join('');
    console.log(`# ${text}`);
  } else if (block.type === 'heading_2') {
    const text = block.heading_2.rich_text.map(t => t.plain_text).join('');
    console.log(`## ${text}`);
  } else if (block.type === 'heading_3') {
    const text = block.heading_3.rich_text.map(t => t.plain_text).join('');
    console.log(`### ${text}`);
  } else if (block.type === 'bulleted_list_item') {
    const text = block.bulleted_list_item.rich_text.map(t => t.plain_text).join('');
    console.log(`• ${text}`);
  } else if (block.type === 'numbered_list_item') {
    const text = block.numbered_list_item.rich_text.map(t => t.plain_text).join('');
    console.log(`${index + 1}. ${text}`);
  } else if (block.type === 'to_do') {
    const text = block.to_do.rich_text.map(t => t.plain_text).join('');
    const checked = block.to_do.checked ? '✓' : '☐';
    console.log(`${checked} ${text}`);
  } else if (block.type === 'toggle') {
    const text = block.toggle.rich_text.map(t => t.plain_text).join('');
    console.log(`▶ ${text}`);
  } else if (block.type === 'child_page') {
    console.log(`📄 ${block.child_page.title}`);
  } else if (block.type === 'child_database') {
    console.log(`🗃️ ${block.child_database.title}`);
  } else if (block.type === 'image') {
    const source = block.image.type === 'external' 
      ? block.image.external.url 
      : block.image.file.url;
    console.log(`🖼️ Image: ${source}`);
  } else if (block.type === 'code') {
    const language = block.code.language;
    const text = block.code.rich_text.map(t => t.plain_text).join('');
    console.log(`\`\`\`${language}\n${text}\n\`\`\``);
  } else {
    console.log(`Content: ${JSON.stringify(block[block.type]).substring(0, 100)}...`);
  }
});

// Analyze all content
console.log(`\n${colors.cyan}Content Analysis:${colors.reset}`);
console.log(`Total Items: ${allContent.length}`);

// Count by object type
const objectTypes = {};
allContent.forEach(item => {
  objectTypes[item.object] = (objectTypes[item.object] || 0) + 1;
});

console.log(`\n${colors.yellow}Object Types:${colors.reset}`);
for (const [type, count] of Object.entries(objectTypes)) {
  console.log(`${type}: ${count}`);
}

// Look for databases
const databases = allContent.filter(item => item.object === 'database');
console.log(`\n${colors.yellow}Databases (${databases.length}):${colors.reset}`);
databases.forEach((db, index) => {
  const title = db.title ? db.title.map(t => t.plain_text).join('') : 'Untitled Database';
  console.log(`${index + 1}. ${title} (${db.id})`);
});

// Look for child pages
const childPages = allContent.filter(item => 
  item.parent && 
  (item.parent.type === 'page_id' || item.parent.type === 'database_id')
);

console.log(`\n${colors.yellow}Child Pages (${childPages.length}):${colors.reset}`);
childPages.slice(0, 10).forEach((page, index) => {
  const title = page.properties?.title?.title?.[0]?.plain_text || 
                page.properties?.Name?.title?.[0]?.plain_text || 
                'Untitled';
  const parentType = page.parent.type;
  const parentId = page.parent[parentType];
  console.log(`${index + 1}. ${title} (Parent: ${parentType.replace('_id', '')} ${parentId})`);
});

// Look for root pages
const rootPages = allContent.filter(item => 
  item.parent && 
  item.parent.type === 'workspace'
);

console.log(`\n${colors.yellow}Root Pages (${rootPages.length}):${colors.reset}`);
rootPages.slice(0, 10).forEach((page, index) => {
  const title = page.properties?.title?.title?.[0]?.plain_text || 
                page.properties?.Name?.title?.[0]?.plain_text || 
                'Untitled';
  console.log(`${index + 1}. ${title} (${page.id})`);
});
