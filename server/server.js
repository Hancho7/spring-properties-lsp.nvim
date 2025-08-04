#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  CompletionItemKind,
  MarkupKind,
  TextEdit,
  Range,
  Position,
} = require('vscode-languageserver/node');
const { TextDocument } = require('vscode-languageserver-textdocument');
const yaml = require('js-yaml');

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Comprehensive Spring Boot Properties Database
const SPRING_PROPERTIES = {
  // Server properties
  'server.port': {
    description: 'Server HTTP port number (default: 8080)',
    type: 'number',
    default: '8080'
  },
  'server.address': {
    description: 'Network address to which the server should bind',
    type: 'string'
  },
  'server.servlet.context-path': {
    description: 'Context path of the application',
    type: 'string'
  },
  'server.ssl.enabled': {
    description: 'Enable SSL support',
    type: 'boolean',
    default: 'false'
  },
  'server.ssl.key-store': {
    description: 'Path to the key store that holds the SSL certificate',
    type: 'string'
  },
  'server.ssl.key-store-password': {
    description: 'Password to access the key store',
    type: 'string'
  },
  
  // DataSource properties
  'spring.datasource.url': {
    description: 'JDBC URL of the database',
    type: 'string',
    example: 'jdbc:mysql://localhost:3306/mydb'
  },
  'spring.datasource.username': {
    description: 'Login username of the database',
    type: 'string'
  },
  'spring.datasource.password': {
    description: 'Login password of the database',
    type: 'string'
  },
  'spring.datasource.driver-class-name': {
    description: 'Fully qualified name of the JDBC driver',
    type: 'string',
    example: 'com.mysql.cj.jdbc.Driver'
  },
  'spring.datasource.hikari.maximum-pool-size': {
    description: 'Maximum number of connections in the pool',
    type: 'number',
    default: '10'
  },
  'spring.datasource.hikari.minimum-idle': {
    description: 'Minimum number of idle connections',
    type: 'number',
    default: '10'
  },
  
  // JPA properties
  'spring.jpa.hibernate.ddl-auto': {
    description: 'DDL mode (none, validate, update, create, create-drop)',
    type: 'string',
    default: 'none'
  },
  'spring.jpa.show-sql': {
    description: 'Enable logging of SQL statements',
    type: 'boolean',
    default: 'false'
  },
  'spring.jpa.properties.hibernate.dialect': {
    description: 'Hibernate SQL dialect',
    type: 'string'
  },
  'spring.jpa.properties.hibernate.format_sql': {
    description: 'Format SQL statements in logs',
    type: 'boolean',
    default: 'false'
  },
  
  // Application properties
  'spring.application.name': {
    description: 'Application name',
    type: 'string'
  },
  'spring.profiles.active': {
    description: 'Comma-separated list of active profiles',
    type: 'string'
  },
  
  // Logging properties
  'logging.level.sql': {
    description: 'SQL logging level',
    type: 'string',
    default: 'INFO'
  },
  'logging.level.org.hibernate.SQL': {
    description: 'Hibernate SQL logging level',
    type: 'string'
  },
  'logging.level.org.hibernate.type.descriptor.sql.BasicBinder': {
    description: 'Hibernate parameter binding logging level',
    type: 'string'
  },
  'logging.file.name': {
    description: 'Log file name',
    type: 'string'
  },
  'logging.file.path': {
    description: 'Log file path',
    type: 'string'
  }
};

function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const logMessage = data 
    ? `[${timestamp}] [SpringPropertiesLSP] ${message}: ${JSON.stringify(data, null, 2)}`
    : `[${timestamp}] [SpringPropertiesLSP] ${message}`;
  connection.console.log(logMessage);
}

function isYamlFile(uri) {
  return /\.(yml|yaml)$/i.test(uri);
}

function isPropertiesFile(uri) {
  return /\.properties$/i.test(uri);
}

// ============================================================================
// YAML Context Handler
// ============================================================================
class YamlContextAnalyzer {
  constructor(document) {
    this.document = document;
    this.lines = document.getText().split('\n');
  }

  /**
   * Get the current property path at the given position
   */
  getCurrentPath(position) {
    const currentLine = this.lines[position.line];
    const currentIndent = this.getIndentation(currentLine);
    const path = [];
    
    // Start from current line and work backwards
    for (let i = position.line; i >= 0; i--) {
      const line = this.lines[i];
      if (this.isEmptyOrComment(line)) continue;
      
      const indent = this.getIndentation(line);
      const key = this.extractKey(line);
      
      if (!key) continue;
      
      if (i === position.line) {
        // Current line - add the key if it's not empty
        if (key.trim()) {
          path.unshift(key);
        }
      } else if (indent < currentIndent) {
        // Parent level
        path.unshift(key);
        currentIndent = indent;
      }
    }
    
    return path.join('.');
  }

  /**
   * Get all existing property paths in the YAML
   */
  getExistingPaths() {
    const paths = new Set();
    const stack = [];
    
    for (const line of this.lines) {
      if (this.isEmptyOrComment(line)) continue;
      
      const indent = this.getIndentation(line);
      const key = this.extractKey(line);
      
      if (!key) continue;
      
      // Adjust stack based on indentation
      while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
        stack.pop();
      }
      
      stack.push({ key, indent });
      
      // Build full path
      const fullPath = stack.map(item => item.key).join('.');
      paths.add(fullPath);
    }
    
    return paths;
  }

  /**
   * Get the prefix being typed at the cursor position
   */
  getTypingPrefix(position) {
    const line = this.lines[position.line];
    const beforeCursor = line.substring(0, position.character);
    
    // Extract the key part after the last colon or at the beginning
    const match = beforeCursor.match(/([^:\s]*)$/);
    return match ? match[1] : '';
  }

  getIndentation(line) {
    const match = line.match(/^(\s*)/);
    return match ? match[1].length : 0;
  }

  extractKey(line) {
    const trimmed = line.trim();
    if (trimmed.includes(':')) {
      return trimmed.split(':')[0].trim();
    }
    return trimmed;
  }

  isEmptyOrComment(line) {
    const trimmed = line.trim();
    return !trimmed || trimmed.startsWith('#');
  }
}

// ============================================================================
// Properties Context Handler
// ============================================================================
class PropertiesContextAnalyzer {
  constructor(document) {
    this.document = document;
    this.lines = document.getText().split('\n');
  }

  /**
   * Get the property key being typed at the cursor position
   */
  getCurrentKey(position) {
    const line = this.lines[position.line];
    const beforeCursor = line.substring(0, position.character);
    
    // If there's an equals sign, get everything before it
    if (beforeCursor.includes('=')) {
      return beforeCursor.split('=')[0].trim();
    }
    
    return beforeCursor.trim();
  }

  /**
   * Get all existing property keys
   */
  getExistingKeys() {
    const keys = new Set();
    
    for (const line of this.lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const key = trimmed.split('=')[0].trim();
        if (key) {
          keys.add(key);
        }
      }
    }
    
    return keys;
  }

  /**
   * Get the prefix being typed for completion
   */
  getTypingPrefix(position) {
    const currentKey = this.getCurrentKey(position);
    return currentKey;
  }
}

// ============================================================================
// Completion Provider
// ============================================================================
function createCompletionItems(matchingProps, format, existingKeys = new Set()) {
  const items = [];
  
  for (const [key, info] of Object.entries(matchingProps)) {
    if (existingKeys.has(key)) continue;
    
    const item = {
      label: key,
      kind: CompletionItemKind.Property,
      detail: `Spring Boot Property (${info.type})`,
      documentation: {
        kind: MarkupKind.Markdown,
        value: createDocumentation(key, info)
      },
      sortText: key,
      filterText: key
    };
    
    if (format === 'yaml') {
      item.insertText = key.split('.').pop() + ': ';
    } else {
      item.insertText = key + '=';
    }
    
    items.push(item);
  }
  
  return items;
}

function createDocumentation(key, info) {
  let doc = `**${key}**\n\n${info.description}`;
  
  if (info.type) {
    doc += `\n\n**Type:** \`${info.type}\``;
  }
  
  if (info.default) {
    doc += `\n\n**Default:** \`${info.default}\``;
  }
  
  if (info.example) {
    doc += `\n\n**Example:** \`${info.example}\``;
  }
  
  return doc;
}

function findMatchingProperties(prefix, maxResults = 50) {
  const matches = {};
  let count = 0;
  
  for (const [key, info] of Object.entries(SPRING_PROPERTIES)) {
    if (count >= maxResults) break;
    
    if (key.toLowerCase().includes(prefix.toLowerCase()) || 
        key.toLowerCase().startsWith(prefix.toLowerCase())) {
      matches[key] = info;
      count++;
    }
  }
  
  return matches;
}

// ============================================================================
// LSP Event Handlers
// ============================================================================
connection.onInitialize(() => {
  log('Initializing Spring Properties LSP Server');
  
  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: 2, // Incremental
      },
      completionProvider: {
        triggerCharacters: ['.', ':', '=', ' '],
        resolveProvider: false
      },
      hoverProvider: true
    },
    serverInfo: {
      name: 'Spring Properties LSP',
      version: '2.0.0'
    }
  };
});

connection.onCompletion(async (params) => {
  const { textDocument, position } = params;
  
  try {
    const document = documents.get(textDocument.uri);
    if (!document) {
      log('Document not found', { uri: textDocument.uri });
      return [];
    }

    log('Completion requested', { 
      uri: textDocument.uri, 
      position,
      line: document.getText().split('\n')[position.line]
    });

    if (isYamlFile(textDocument.uri)) {
      return handleYamlCompletion(document, position);
    } else if (isPropertiesFile(textDocument.uri)) {
      return handlePropertiesCompletion(document, position);
    }

    return [];
  } catch (error) {
    log('Completion error', { error: error.message, stack: error.stack });
    return [];
  }
});

function handleYamlCompletion(document, position) {
  const analyzer = new YamlContextAnalyzer(document);
  const currentPath = analyzer.getCurrentPath(position);
  const existingPaths = analyzer.getExistingPaths();
  const prefix = analyzer.getTypingPrefix(position);
  
  log('YAML completion context', { currentPath, prefix, existingPaths: Array.from(existingPaths) });
  
  // Build search prefix - combine current path with typing prefix
  let searchPrefix = currentPath;
  if (prefix && !currentPath.endsWith(prefix)) {
    searchPrefix = currentPath ? `${currentPath}.${prefix}` : prefix;
  }
  
  const matchingProps = findMatchingProperties(searchPrefix);
  const completionItems = createCompletionItems(matchingProps, 'yaml', existingPaths);
  
  log('YAML completion results', { 
    searchPrefix, 
    matchCount: Object.keys(matchingProps).length,
    itemCount: completionItems.length 
  });
  
  return completionItems;
}

function handlePropertiesCompletion(document, position) {
  const analyzer = new PropertiesContextAnalyzer(document);
  const existingKeys = analyzer.getExistingKeys();
  const prefix = analyzer.getTypingPrefix(position);
  
  log('Properties completion context', { prefix, existingKeys: Array.from(existingKeys) });
  
  const matchingProps = findMatchingProperties(prefix);
  const completionItems = createCompletionItems(matchingProps, 'properties', existingKeys);
  
  log('Properties completion results', { 
    prefix, 
    matchCount: Object.keys(matchingProps).length,
    itemCount: completionItems.length 
  });
  
  return completionItems;
}

connection.onHover(async (params) => {
  const { textDocument, position } = params;
  
  try {
    const document = documents.get(textDocument.uri);
    if (!document) return null;

    const line = document.getText().split('\n')[position.line];
    let propertyKey = '';

    if (isYamlFile(textDocument.uri)) {
      const analyzer = new YamlContextAnalyzer(document);
      propertyKey = analyzer.getCurrentPath(position);
    } else if (isPropertiesFile(textDocument.uri)) {
      const analyzer = new PropertiesContextAnalyzer(document);
      propertyKey = analyzer.getCurrentKey(position);
    }

    const propertyInfo = SPRING_PROPERTIES[propertyKey];
    if (propertyInfo) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: createDocumentation(propertyKey, propertyInfo)
        }
      };
    }

    return null;
  } catch (error) {
    log('Hover error', { error: error.message });
    return null;
  }
});

connection.onInitialized(() => {
  log('Spring Properties LSP Server initialized successfully');
});

// ============================================================================
// Document Management
// ============================================================================
documents.onDidChangeContent(change => {
  log('Document changed', { uri: change.document.uri });
});

documents.onDidOpen(event => {
  log('Document opened', { uri: event.document.uri });
});

documents.onDidClose(event => {
  log('Document closed', { uri: event.document.uri });
});

// ============================================================================
// Error Handling
// ============================================================================
process.on('unhandledRejection', (reason, promise) => {
  log('Unhandled Rejection', { reason, promise });
});

process.on('uncaughtException', (error) => {
  log('Uncaught Exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

// ============================================================================
// Start Server
// ============================================================================
documents.listen(connection);
connection.listen();

log('Spring Properties LSP Server started and listening...');
