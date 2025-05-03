/**
 * Notion Utilities
 *
 * Helper functions for working with Notion API responses.
 * These functions help extract and format content from Notion.
 */

/**
 * Extract plain text from rich text objects
 * @param {Array} richText - Array of rich text objects
 * @returns {string} - Plain text content
 */
const extractTextFromRichText = (richText = []) => {
  if (!richText || !Array.isArray(richText)) {
    return '';
  }

  return richText.map(text => text.plain_text || '').join('');
};

/**
 * Get page title from page object
 * @param {Object} page - Notion page object
 * @returns {string} - Page title
 */
const getPageTitle = (page) => {
  if (!page) return 'Untitled';

  // Handle different page structures
  if (page.properties && page.properties.title) {
    // Database item
    return extractTextFromRichText(page.properties.title.title);
  } else if (page.properties && page.properties.Name) {
    // Database item with Name property
    return extractTextFromRichText(page.properties.Name.title);
  } else if (page.title) {
    // Regular page
    return extractTextFromRichText(page.title);
  }

  return 'Untitled';
};

/**
 * Extract text content from a block
 * @param {Object} block - Notion block object
 * @returns {string} - Text content
 */
const extractTextFromBlock = (block) => {
  if (!block) return '';

  const blockType = block.type;
  if (!blockType || !block[blockType]) return '';

  // Handle different block types
  switch (blockType) {
    case 'paragraph':
      return extractTextFromRichText(block.paragraph.rich_text);
    case 'heading_1':
      return extractTextFromRichText(block.heading_1.rich_text);
    case 'heading_2':
      return extractTextFromRichText(block.heading_2.rich_text);
    case 'heading_3':
      return extractTextFromRichText(block.heading_3.rich_text);
    case 'bulleted_list_item':
      return '• ' + extractTextFromRichText(block.bulleted_list_item.rich_text);
    case 'numbered_list_item':
      return '- ' + extractTextFromRichText(block.numbered_list_item.rich_text);
    case 'to_do':
      const checked = block.to_do.checked ? '[x]' : '[ ]';
      return `${checked} ${extractTextFromRichText(block.to_do.rich_text)}`;
    case 'toggle':
      return extractTextFromRichText(block.toggle.rich_text);
    case 'code':
      return '```\n' + extractTextFromRichText(block.code.rich_text) + '\n```';
    case 'quote':
      return '> ' + extractTextFromRichText(block.quote.rich_text);
    case 'callout':
      return `[!] ${extractTextFromRichText(block.callout.rich_text)}`;
    default:
      return '';
  }
};

/**
 * Extract text from a collection of blocks
 * @param {Array} blocks - Array of Notion blocks
 * @returns {string} - Combined text content
 */
const extractTextFromBlocks = (blocks = []) => {
  if (!blocks || !Array.isArray(blocks)) {
    return '';
  }

  return blocks.map(block => extractTextFromBlock(block)).filter(text => text).join('\n');
};

/**
 * Format search results for easier consumption
 * @param {Object} searchResponse - Notion search response
 * @returns {Array} - Formatted results
 */
const formatSearchResults = (searchResponse) => {
  if (!searchResponse || !searchResponse.results) {
    return [];
  }

  return searchResponse.results.map(result => {
    const common = {
      id: result.id,
      url: result.url,
      createdTime: result.created_time,
      lastEditedTime: result.last_edited_time
    };

    if (result.object === 'page') {
      return {
        ...common,
        type: 'page',
        title: getPageTitle(result),
        icon: result.icon,
        parent: result.parent
      };
    } else if (result.object === 'database') {
      return {
        ...common,
        type: 'database',
        title: extractTextFromRichText(result.title),
        description: result.description ? extractTextFromRichText(result.description) : '',
        properties: Object.keys(result.properties || {})
      };
    }

    return {
      ...common,
      type: result.object
    };
  });
};

/**
 * Extract database items in a simplified format
 * @param {Object} queryResponse - Database query response
 * @returns {Array} - Formatted database items
 */
const formatDatabaseItems = (queryResponse) => {
  if (!queryResponse || !queryResponse.results) {
    return [];
  }

  return queryResponse.results.map(page => {
    const result = {
      id: page.id,
      url: page.url,
      createdTime: page.created_time,
      lastEditedTime: page.last_edited_time,
      title: getPageTitle(page),
      properties: {}
    };

    // Extract property values
    if (page.properties) {
      Object.entries(page.properties).forEach(([key, property]) => {
        if (property.type === 'title') {
          // Already handled above
        } else if (property.type === 'rich_text') {
          result.properties[key] = extractTextFromRichText(property.rich_text);
        } else if (property.type === 'number') {
          result.properties[key] = property.number;
        } else if (property.type === 'select') {
          result.properties[key] = property.select?.name || null;
        } else if (property.type === 'multi_select') {
          result.properties[key] = (property.multi_select || []).map(item => item.name);
        } else if (property.type === 'date') {
          result.properties[key] = property.date;
        } else if (property.type === 'checkbox') {
          result.properties[key] = property.checkbox;
        } else if (property.type === 'url') {
          result.properties[key] = property.url;
        } else if (property.type === 'email') {
          result.properties[key] = property.email;
        } else if (property.type === 'phone_number') {
          result.properties[key] = property.phone_number;
        } else if (property.type === 'formula') {
          result.properties[key] = property.formula.string ||
                                  property.formula.number ||
                                  property.formula.boolean;
        }
      });
    }

    return result;
  });
};

/**
 * Extract text from a title object
 * @param {Object} title - Notion title object
 * @returns {string} - Plain text title
 */
const extractTextFromTitle = (title) => {
  if (!title) return '';

  // Handle different title structures
  if (Array.isArray(title)) {
    // Title is an array of rich text objects
    return extractTextFromRichText(title);
  } else if (title.title && Array.isArray(title.title)) {
    // Title is an object with a title property that's an array
    return extractTextFromRichText(title.title);
  } else if (title.plain_text) {
    // Title is a single rich text object
    return title.plain_text;
  } else if (typeof title === 'string') {
    // Title is already a string
    return title;
  }

  return '';
};

module.exports = {
  extractTextFromRichText,
  getPageTitle,
  extractTextFromBlock,
  extractTextFromBlocks,
  formatSearchResults,
  formatDatabaseItems,
  extractTextFromTitle
};
