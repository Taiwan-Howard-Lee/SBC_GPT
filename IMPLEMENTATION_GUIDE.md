# SBC GPT Notion Integration - Implementation Guide

This guide provides detailed implementation instructions for the Notion integration improvement project. It focuses on the MVP approach using hardcoded structure representation.

## 1. Hardcoded Structure Definition

### File: `src/integrations/notion/workspaceStructure.js`

```javascript
/**
 * Hardcoded representation of the Notion workspace structure
 * 
 * This defines the main sections, document types, and their characteristics.
 * For the MVP, this is a hardcoded approach that will be replaced with
 * dynamic discovery in future versions.
 */

const WORKSPACE_STRUCTURE = {
  // Main sections of the workspace
  sections: {
    'accounting_finance': {
      title: 'Accounting / Finance',
      documentType: 'SECTION',
      childTypes: ['PROCEDURE', 'POLICY', 'CONTACT_LIST', 'FORM'],
      keyTerms: ['budget', 'expense', 'invoice', 'payment', 'accounting', 'finance'],
      // Known child pages
      children: [
        'company_information',
        'bank_accounts',
        'insurance',
        'compliance',
        'australian_financial_services_license',
        'investment_trusts_and_funds',
        'startup_valuation_policy',
        'fund_management',
        'startup_investment_payments',
        'supplier_and_contractors',
        'client_contracts_and_invoicing',
        'payroll',
        'staff_expense_management',
        'end_of_month_process',
        'grant_tracking_and_acquittals',
        'sales_startup_terms'
      ]
    },
    // Add other main sections as needed
  },
  
  // Document types and their characteristics
  documentTypes: {
    'POLICY': {
      keyTerms: ['policy', 'guideline', 'rule', 'requirement'],
      importance: 'high',
      contentStructure: 'formal'
    },
    'PROCEDURE': {
      keyTerms: ['procedure', 'process', 'step', 'how to', 'workflow'],
      importance: 'high',
      contentStructure: 'sequential'
    },
    'CONTACT_LIST': {
      keyTerms: ['contact', 'email', 'phone', 'person', 'team'],
      importance: 'medium',
      contentStructure: 'list'
    },
    'FORM': {
      keyTerms: ['form', 'template', 'fill', 'submit'],
      importance: 'medium',
      contentStructure: 'template'
    },
    'GENERAL_INFO': {
      keyTerms: ['information', 'about', 'overview'],
      importance: 'medium',
      contentStructure: 'informational'
    }
  }
};

module.exports = WORKSPACE_STRUCTURE;
```

## 2. Page ID Mapping System

### File: `src/integrations/notion/pageMapper.js`

```javascript
/**
 * Page Mapper
 * 
 * Maps Notion page IDs to the defined workspace structure.
 * Uses fuzzy matching for titles and provides fallback classification.
 */

const notionApi = require('./api');
const notionUtils = require('./utils');
const WORKSPACE_STRUCTURE = require('./workspaceStructure');

class PageMapper {
  constructor() {
    this.pageIdMap = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the page mapper
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    try {
      this.pageIdMap = await this.buildPageIdMap();
      this.initialized = true;
      console.log(`Page mapper initialized with ${Object.keys(this.pageIdMap).length} pages`);
    } catch (error) {
      console.error('Error initializing page mapper:', error);
      throw error;
    }
  }
  
  /**
   * Build the page ID map
   */
  async buildPageIdMap() {
    // Get all pages (just metadata)
    const pages = await this.getAllPageMetadata();
    
    // Create mapping
    const pageIdMap = {};
    
    // Process each page
    for (const page of pages) {
      const pageId = page.id;
      const pageTitle = notionUtils.getPageTitle(page);
      
      // Try to match to our known structure
      let matched = false;
      
      // Check if it's a main section
      for (const [sectionKey, section] of Object.entries(WORKSPACE_STRUCTURE.sections)) {
        if (this.titleMatches(pageTitle, section.title)) {
          pageIdMap[pageId] = {
            type: 'SECTION',
            key: sectionKey,
            title: pageTitle,
            parent: page.parent
          };
          matched = true;
          break;
        }
        
        // Check if it's a known child page
        for (const childKey of section.children) {
          const childTitle = childKey.replace(/_/g, ' ');
          if (this.titleMatches(pageTitle, childTitle)) {
            pageIdMap[pageId] = {
              type: 'CHILD_PAGE',
              key: childKey,
              parentSection: sectionKey,
              title: pageTitle,
              parent: page.parent
            };
            matched = true;
            break;
          }
        }
        
        if (matched) break;
      }
      
      // If not matched to known structure, try to classify by content
      if (!matched) {
        // Simple classification based on title
        let documentType = 'GENERAL_INFO';
        
        for (const [typeKey, typeInfo] of Object.entries(WORKSPACE_STRUCTURE.documentTypes)) {
          for (const term of typeInfo.keyTerms) {
            if (pageTitle.toLowerCase().includes(term)) {
              documentType = typeKey;
              break;
            }
          }
        }
        
        pageIdMap[pageId] = {
          type: 'UNKNOWN_PAGE',
          documentType,
          title: pageTitle,
          parent: page.parent
        };
      }
    }
    
    return pageIdMap;
  }
  
  /**
   * Get all page metadata from Notion
   */
  async getAllPageMetadata() {
    const pages = [];
    let hasMore = true;
    let startCursor = undefined;
    
    while (hasMore) {
      const response = await notionApi.search({
        start_cursor: startCursor,
        page_size: 100,
        filter: {
          property: 'object',
          value: 'page'
        }
      });
      
      pages.push(...response.results);
      
      hasMore = response.has_more;
      startCursor = response.next_cursor;
      
      // Add a small delay to avoid rate limiting
      if (hasMore) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return pages;
  }
  
  /**
   * Check if titles match (fuzzy matching)
   */
  titleMatches(title1, title2) {
    // Normalize both titles
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const norm1 = normalize(title1);
    const norm2 = normalize(title2);
    
    // Check for exact match after normalization
    if (norm1 === norm2) return true;
    
    // Check if one contains the other
    if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    
    // Could add more sophisticated fuzzy matching if needed
    
    return false;
  }
  
  /**
   * Get mapping for a specific page ID
   */
  getPageMapping(pageId) {
    if (!this.initialized) {
      throw new Error('Page mapper not initialized');
    }
    
    return this.pageIdMap[pageId] || null;
  }
  
  /**
   * Get all pages for a specific section
   */
  getPagesForSection(sectionKey) {
    if (!this.initialized) {
      throw new Error('Page mapper not initialized');
    }
    
    const pages = [];
    
    for (const [pageId, mapping] of Object.entries(this.pageIdMap)) {
      if (mapping.type === 'SECTION' && mapping.key === sectionKey) {
        pages.push(pageId);
      } else if (mapping.type === 'CHILD_PAGE' && mapping.parentSection === sectionKey) {
        pages.push(pageId);
      }
    }
    
    return pages;
  }
  
  /**
   * Get all pages of a specific document type
   */
  getPagesOfType(documentType) {
    if (!this.initialized) {
      throw new Error('Page mapper not initialized');
    }
    
    const pages = [];
    
    for (const [pageId, mapping] of Object.entries(this.pageIdMap)) {
      if (mapping.documentType === documentType) {
        pages.push(pageId);
      }
    }
    
    return pages;
  }
}

// Create singleton instance
const pageMapper = new PageMapper();

module.exports = pageMapper;
```

## 3. Structure-Aware Search

### File: `src/integrations/notion/structuredSearch.js`

```javascript
/**
 * Structure-Aware Search
 * 
 * Implements search functionality that leverages the workspace structure
 * to find the most relevant content for a query.
 */

const WORKSPACE_STRUCTURE = require('./workspaceStructure');
const pageMapper = require('./pageMapper');
const notionApi = require('./api');
const notionUtils = require('./utils');

class StructuredSearch {
  constructor() {
    this.initialized = false;
  }
  
  /**
   * Initialize the structured search
   */
  async initialize() {
    if (this.initialized) {
      return;
    }
    
    // Make sure page mapper is initialized
    await pageMapper.initialize();
    
    this.initialized = true;
    console.log('Structured search initialized');
  }
  
  /**
   * Perform a structure-aware search
   */
  async search(query, options = {}) {
    if (!this.initialized) {
      throw new Error('Structured search not initialized');
    }
    
    // Default options
    const defaultOptions = {
      maxResults: 5,
      includeContent: false
    };
    
    const searchOptions = { ...defaultOptions, ...options };
    
    // Analyze query to determine relevant sections
    const relevantSections = this.findRelevantSections(query);
    
    // Perform search with section prioritization
    const results = [];
    
    // First search in highly relevant sections
    for (const sectionKey of relevantSections.highRelevance) {
      const sectionResults = await this.searchInSection(query, sectionKey, searchOptions);
      results.push(...sectionResults);
      
      // Stop if we have enough results
      if (results.length >= searchOptions.maxResults) {
        break;
      }
    }
    
    // If we don't have enough results, try medium relevance sections
    if (results.length < searchOptions.maxResults) {
      for (const sectionKey of relevantSections.mediumRelevance) {
        const sectionResults = await this.searchInSection(query, sectionKey, searchOptions);
        results.push(...sectionResults);
        
        // Stop if we have enough results
        if (results.length >= searchOptions.maxResults) {
          break;
        }
      }
    }
    
    // If we still don't have enough results, try low relevance sections
    if (results.length < searchOptions.maxResults) {
      for (const sectionKey of relevantSections.lowRelevance) {
        const sectionResults = await this.searchInSection(query, sectionKey, searchOptions);
        results.push(...sectionResults);
        
        // Stop if we have enough results
        if (results.length >= searchOptions.maxResults) {
          break;
        }
      }
    }
    
    // Deduplicate and sort by relevance
    return this.deduplicateAndSort(results).slice(0, searchOptions.maxResults);
  }
  
  // Additional methods will be implemented here
}

// Create singleton instance
const structuredSearch = new StructuredSearch();

module.exports = structuredSearch;
```

## Next Steps

After implementing these core components, the next steps would be:

1. **Implement the Two-Stage Retrieval Process**:
   - Create functions for initial search and detailed retrieval
   - Add preview generation for search results
   - Include structural context in responses

2. **Add Content Processing by Document Type**:
   - Implement type-specific content processors
   - Create extractors for different content elements
   - Add formatting functions for different document types

3. **Implement Query Intent Classification**:
   - Create a basic intent classifier
   - Add intent-specific search strategies
   - Implement response formatting based on intent

4. **Enhance the Notion Agent**:
   - Update the agent to use the new components
   - Improve the canHandle function
   - Enhance the process function with the new retrieval system

## Testing

For each component, create test cases that verify:

1. **Structure Definition**:
   - All required sections and document types are defined
   - Key terms are appropriate for each section
   - Child pages are correctly mapped

2. **Page Mapping**:
   - Pages are correctly mapped to the structure
   - Fuzzy matching works for similar titles
   - Unknown pages are classified appropriately

3. **Structure-Aware Search**:
   - Relevant sections are correctly identified
   - Search results are properly prioritized
   - Results are deduplicated and sorted correctly

## Integration

Once all components are implemented and tested, integrate them with the main application:

1. Update the Notion agent to use the new components
2. Connect the agent to the central router
3. Test the entire integration with real queries
4. Monitor performance and make adjustments as needed
