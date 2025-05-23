/**
 * Comprehensive Notion Content Analyzer
 * 
 * This script analyzes all content retrieved from Notion
 * and provides detailed insights about the structure and content.
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

// Load all content data
const allContentPath = path.join(__dirname, 'notion-data', 'all-content.json');
const allContent = require(allContentPath);

console.log(`${colors.magenta}Comprehensive Notion Content Analysis${colors.reset}\n`);

// Basic statistics
console.log(`${colors.cyan}Basic Statistics:${colors.reset}`);
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

// Analyze parent types
const parentTypes = {};
allContent.forEach(item => {
  if (item.parent) {
    parentTypes[item.parent.type] = (parentTypes[item.parent.type] || 0) + 1;
  }
});

console.log(`\n${colors.yellow}Parent Types:${colors.reset}`);
for (const [type, count] of Object.entries(parentTypes)) {
  console.log(`${type}: ${count}`);
}

// Find all unique property keys
const propertyKeys = new Set();
allContent.forEach(item => {
  if (item.properties) {
    Object.keys(item.properties).forEach(key => propertyKeys.add(key));
  }
});

console.log(`\n${colors.yellow}Property Keys (${propertyKeys.size}):${colors.reset}`);
console.log([...propertyKeys].join(', '));

// Find pages with content
const pagesWithContent = allContent.filter(item => 
  item.properties && 
  item.properties.title && 
  item.properties.title.title && 
  item.properties.title.title.length > 0 &&
  item.properties.title.title[0].plain_text
);

console.log(`\n${colors.yellow}Pages with Titles (${pagesWithContent.length}):${colors.reset}`);
pagesWithContent.slice(0, 20).forEach((page, index) => {
  const title = page.properties.title.title[0].plain_text;
  console.log(`${index + 1}. ${title} (${page.id})`);
});

// Find pages with specific properties
const pagesWithTags = allContent.filter(item => 
  item.properties && 
  item.properties.Tags
);

console.log(`\n${colors.yellow}Pages with Tags (${pagesWithTags.length}):${colors.reset}`);
pagesWithTags.slice(0, 10).forEach((page, index) => {
  const title = page.properties.title?.title?.[0]?.plain_text || 'Untitled';
  const tags = page.properties.Tags;
  console.log(`${index + 1}. ${title} - Tags: ${JSON.stringify(tags).substring(0, 100)}...`);
});

// Find pages with specific properties
const pagesWithStatus = allContent.filter(item => 
  item.properties && 
  item.properties.Status
);

console.log(`\n${colors.yellow}Pages with Status (${pagesWithStatus.length}):${colors.reset}`);
pagesWithStatus.slice(0, 10).forEach((page, index) => {
  const title = page.properties.title?.title?.[0]?.plain_text || 'Untitled';
  const status = page.properties.Status;
  console.log(`${index + 1}. ${title} - Status: ${JSON.stringify(status).substring(0, 100)}...`);
});

// Find pages with specific content
const pagesWithRichText = allContent.filter(item => 
  item.properties && 
  Object.values(item.properties).some(prop => 
    prop.type === 'rich_text' && 
    prop.rich_text && 
    prop.rich_text.length > 0
  )
);

console.log(`\n${colors.yellow}Pages with Rich Text (${pagesWithRichText.length}):${colors.reset}`);
pagesWithRichText.slice(0, 10).forEach((page, index) => {
  const title = page.properties.title?.title?.[0]?.plain_text || 'Untitled';
  
  // Find the rich text properties
  const richTextProps = Object.entries(page.properties)
    .filter(([_, prop]) => 
      prop.type === 'rich_text' && 
      prop.rich_text && 
      prop.rich_text.length > 0
    );
  
  console.log(`${index + 1}. ${title} - Rich Text Properties: ${richTextProps.map(([key]) => key).join(', ')}`);
  
  // Show the content of the first rich text property
  if (richTextProps.length > 0) {
    const [key, prop] = richTextProps[0];
    const text = prop.rich_text.map(t => t.plain_text).join('');
    console.log(`   ${key}: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
  }
});

// Find pages with dates
const pagesWithDates = allContent.filter(item => 
  item.properties && 
  Object.values(item.properties).some(prop => 
    prop.type === 'date' && 
    prop.date
  )
);

console.log(`\n${colors.yellow}Pages with Dates (${pagesWithDates.length}):${colors.reset}`);
pagesWithDates.slice(0, 10).forEach((page, index) => {
  const title = page.properties.title?.title?.[0]?.plain_text || 'Untitled';
  
  // Find the date properties
  const dateProps = Object.entries(page.properties)
    .filter(([_, prop]) => 
      prop.type === 'date' && 
      prop.date
    );
  
  console.log(`${index + 1}. ${title} - Date Properties: ${dateProps.map(([key]) => key).join(', ')}`);
  
  // Show the content of the first date property
  if (dateProps.length > 0) {
    const [key, prop] = dateProps[0];
    console.log(`   ${key}: ${prop.date.start}${prop.date.end ? ` to ${prop.date.end}` : ''}`);
  }
});

// Find pages with people
const pagesWithPeople = allContent.filter(item => 
  item.properties && 
  Object.values(item.properties).some(prop => 
    prop.type === 'people' && 
    prop.people && 
    prop.people.length > 0
  )
);

console.log(`\n${colors.yellow}Pages with People (${pagesWithPeople.length}):${colors.reset}`);
pagesWithPeople.slice(0, 10).forEach((page, index) => {
  const title = page.properties.title?.title?.[0]?.plain_text || 'Untitled';
  
  // Find the people properties
  const peopleProps = Object.entries(page.properties)
    .filter(([_, prop]) => 
      prop.type === 'people' && 
      prop.people && 
      prop.people.length > 0
    );
  
  console.log(`${index + 1}. ${title} - People Properties: ${peopleProps.map(([key]) => key).join(', ')}`);
  
  // Show the content of the first people property
  if (peopleProps.length > 0) {
    const [key, prop] = peopleProps[0];
    const people = prop.people.map(p => p.name || p.id).join(', ');
    console.log(`   ${key}: ${people}`);
  }
});

// Find pages with files
const pagesWithFiles = allContent.filter(item => 
  item.properties && 
  Object.values(item.properties).some(prop => 
    prop.type === 'files' && 
    prop.files && 
    prop.files.length > 0
  )
);

console.log(`\n${colors.yellow}Pages with Files (${pagesWithFiles.length}):${colors.reset}`);
pagesWithFiles.slice(0, 10).forEach((page, index) => {
  const title = page.properties.title?.title?.[0]?.plain_text || 'Untitled';
  
  // Find the file properties
  const fileProps = Object.entries(page.properties)
    .filter(([_, prop]) => 
      prop.type === 'files' && 
      prop.files && 
      prop.files.length > 0
    );
  
  console.log(`${index + 1}. ${title} - File Properties: ${fileProps.map(([key]) => key).join(', ')}`);
  
  // Show the content of the first file property
  if (fileProps.length > 0) {
    const [key, prop] = fileProps[0];
    const files = prop.files.map(f => {
      if (f.type === 'external') {
        return `External: ${f.external.url}`;
      } else if (f.type === 'file') {
        return `File: ${f.file.url}`;
      }
      return f.name || f.type;
    }).join(', ');
    console.log(`   ${key}: ${files}`);
  }
});
