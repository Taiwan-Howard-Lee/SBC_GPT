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
      keyTerms: ['budget', 'expense', 'invoice', 'payment', 'accounting', 'finance', 'financial', 'money', 'fund'],
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
    // Add other main sections as needed based on your Notion workspace
  },
  
  // Document types and their characteristics
  documentTypes: {
    'POLICY': {
      keyTerms: ['policy', 'guideline', 'rule', 'requirement', 'standard', 'protocol'],
      importance: 'high',
      contentStructure: 'formal'
    },
    'PROCEDURE': {
      keyTerms: ['procedure', 'process', 'step', 'how to', 'workflow', 'method', 'instruction'],
      importance: 'high',
      contentStructure: 'sequential'
    },
    'CONTACT_LIST': {
      keyTerms: ['contact', 'email', 'phone', 'person', 'team', 'directory', 'staff'],
      importance: 'medium',
      contentStructure: 'list'
    },
    'FORM': {
      keyTerms: ['form', 'template', 'fill', 'submit', 'application', 'document'],
      importance: 'medium',
      contentStructure: 'template'
    },
    'GENERAL_INFO': {
      keyTerms: ['information', 'about', 'overview', 'summary', 'description', 'details'],
      importance: 'medium',
      contentStructure: 'informational'
    }
  },
  
  // Block types that might contain important content
  blockTypes: {
    'paragraph': {
      importance: 'medium',
      contentType: 'text'
    },
    'heading_1': {
      importance: 'high',
      contentType: 'title'
    },
    'heading_2': {
      importance: 'high',
      contentType: 'subtitle'
    },
    'heading_3': {
      importance: 'medium',
      contentType: 'subtitle'
    },
    'bulleted_list_item': {
      importance: 'high',
      contentType: 'list'
    },
    'numbered_list_item': {
      importance: 'high',
      contentType: 'list'
    },
    'to_do': {
      importance: 'high',
      contentType: 'task'
    },
    'toggle': {
      importance: 'medium',
      contentType: 'expandable'
    },
    'child_page': {
      importance: 'high',
      contentType: 'reference'
    },
    'child_database': {
      importance: 'high',
      contentType: 'reference'
    }
  }
};

module.exports = WORKSPACE_STRUCTURE;
