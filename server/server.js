#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  CompletionItemKind,
  MarkupKind,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Spring Boot Properties Database
const SPRING_PROPERTIES = {
  'server.port': 'Server HTTP port (default: 8080)',
  'server.address': 'Network address to bind the server',
  'server.servlet.context-path': 'Context path of the application',
  'server.ssl.enabled': 'Enable SSL support (true/false)',
  'server.ssl.key-store': 'Path to the SSL key store',
  'server.ssl.key-store-password': 'Password for the SSL key store',
  
  'spring.application.name': 'Name of the application',
  'spring.profiles.active': 'Active Spring profiles (comma-separated)',
  
  'spring.datasource.url': 'JDBC URL for the database connection',
  'spring.datasource.username': 'Database username',
  'spring.datasource.password': 'Database password',
  'spring.datasource.driver-class-name': 'JDBC driver class name',
  'spring.datasource.hikari.maximum-pool-size': 'Maximum number of connections in pool',
  'spring.datasource.hikari.minimum-idle': 'Minimum idle connections in pool',
  'spring.datasource.hikari.connection-timeout': 'Connection timeout in milliseconds',
  
  'spring.jpa.hibernate.ddl-auto': 'Hibernate DDL mode (create, update, validate, none)',
  'spring.jpa.show-sql': 'Show SQL statements in logs (true/false)',
  'spring.jpa.properties.hibernate.dialect': 'Hibernate SQL dialect',
  'spring.jpa.properties.hibernate.format_sql': 'Format SQL in logs (true/false)',
  
  'logging.level.sql': 'SQL logging level',
  'logging.level.org.hibernate.SQL': 'Hibernate SQL logging level',
  'logging.level.org.hibernate.type.descriptor.sql.BasicBinder': 'Hibernate parameter logging',
  'logging.file.name': 'Name of the log file',
  'logging.file.path': 'Path where log files are stored',
  'logging.pattern.console': 'Console logging pattern',
  'logging.pattern.file': 'File logging pattern'
};

function log(message) {
  connection.console.log(`[SpringPropertiesLSP] ${message}`);
}

function isPropertiesFile(uri) {
  return uri.toLowerCase().endsWith('.properties');
}

class PropertiesAnalyzer {
  constructor(document) {
    this.document = document;
    this.text = document.getText();
    this.lines = this.text.split('\n');
  }

  // Get the property key being typed at cursor position
  getPropertyKeyAtPosition(position) {
    const line = this.lines[position.line];
    const textBeforeCursor = line.substring(0, position.character);
    
    // If line contains '=', get everything before it
    if (textBeforeCursor.includes('=')) {
      return textBeforeCursor.split('=')[0].trim();
    }
    
    // Otherwise, return the text before cursor (trimmed)
    return textBeforeCursor.trim();
  }

  // Get all existing property keys in the file
  getExistingKeys() {
    const existingKeys = new Set();
    
    for (const line of this.lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#')) {
        continue;
      }
      
      // Extract key from key=value pairs
      if (trimmedLine.includes('=')) {
        const key = trimmedLine.split('=')[0].trim();
        if (key) {
          existingKeys.add(key);
        }
      }
    }
    
    return existingKeys;
  }
}

// Initialize LSP server
connection.onInitialize(() => {
  log('Initializing Spring Properties LSP Server');
  
  return {
    capabilities: {
      textDocumentSync: 1, // Full document sync
      completionProvider: {
        triggerCharacters: ['.', '=']
      },
      hoverProvider: true
    }
  };
});

// Handle completion requests
connection.onCompletion((params) => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document || !isPropertiesFile(params.textDocument.uri)) {
      return [];
    }

    const analyzer = new PropertiesAnalyzer(document);
    const currentKey = analyzer.getPropertyKeyAtPosition(params.position);
    const existingKeys = analyzer.getExistingKeys();
    
    log(`Completion requested - Current key: "${currentKey}"`);
    log(`Existing keys: ${Array.from(existingKeys).join(', ')}`);

    const completionItems = [];
    
    // Find matching properties
    for (const [propertyKey, description] of Object.entries(SPRING_PROPERTIES)) {
      // Skip if this property already exists
      if (existingKeys.has(propertyKey)) {
        continue;
      }
      
      // Check if property matches current typing
      if (propertyKey.toLowerCase().startsWith(currentKey.toLowerCase())) {
        const completionItem = {
          label: propertyKey,
          kind: CompletionItemKind.Property,
          detail: 'Spring Boot Property',
          documentation: {
            kind: MarkupKind.PlainText,
            value: description
          },
          insertText: propertyKey + '=',
          sortText: propertyKey
        };
        
        completionItems.push(completionItem);
      }
    }
    
    log(`Found ${completionItems.length} completion items`);
    return completionItems;
    
  } catch (error) {
    log(`Completion error: ${error.message}`);
    return [];
  }
});

// Handle hover requests
connection.onHover((params) => {
  try {
    const document = documents.get(params.textDocument.uri);
    if (!document || !isPropertiesFile(params.textDocument.uri)) {
      return null;
    }

    const analyzer = new PropertiesAnalyzer(document);
    const propertyKey = analyzer.getPropertyKeyAtPosition(params.position);
    
    // Check if we have documentation for this property
    const description = SPRING_PROPERTIES[propertyKey];
    if (description) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${propertyKey}**\n\n${description}`
        }
      };
    }
    
    return null;
    
  } catch (error) {
    log(`Hover error: ${error.message}`);
    return null;
  }
});

connection.onInitialized(() => {
  log('Spring Properties LSP Server initialized successfully');
});

// Document event handlers
documents.onDidOpen((event) => {
  log(`Document opened: ${event.document.uri}`);
});

documents.onDidClose((event) => {
  log(`Document closed: ${event.document.uri}`);
});

// Error handling
process.on('unhandledRejection', (reason) => {
  log(`Unhandled rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  log(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

// Start the server
documents.listen(connection);
connection.listen();

log('Spring Properties LSP Server started and listening...');
