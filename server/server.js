#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  CompletionItem,
  CompletionItemKind,
  MarkupKind,
  InsertTextFormat,
} = require("vscode-languageserver/node");
const { TextDocument } = require("vscode-languageserver-textdocument");
const yaml = require("js-yaml");

// Create connection and document manager
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Spring Boot Properties Database
const SPRING_PROPS = {
  // Server Configuration
  "server.port": { type: "integer", desc: "Server HTTP port", default: "8080" },
  "server.address": { type: "string", desc: "Network address to which the server should bind" },
  "server.servlet.context-path": { type: "string", desc: "Context path of the application", default: "/" },
  "server.servlet.session.timeout": { type: "duration", desc: "Session timeout", default: "30m" },
  "server.compression.enabled": { type: "boolean", desc: "Whether response compression is enabled", default: "false" },
  "server.ssl.enabled": { type: "boolean", desc: "Whether SSL is enabled", default: "false" },
  "server.ssl.key-store": { type: "string", desc: "Path to the key store" },
  "server.ssl.key-store-password": { type: "string", desc: "Password for the key store" },
  "server.error.whitelabel.enabled": { type: "boolean", desc: "Enable default error page", default: "true" },

  // Spring Core
  "spring.application.name": { type: "string", desc: "Application name" },
  "spring.profiles.active": { type: "string", desc: "Comma-separated list of active profiles" },
  "spring.profiles.include": { type: "string", desc: "Additional profiles to include" },
  "spring.main.banner-mode": { type: "string", desc: "Banner display mode", enum: ["console", "log", "off"], default: "console" },
  "spring.main.lazy-initialization": { type: "boolean", desc: "Enable lazy initialization", default: "false" },

  // Database Configuration
  "spring.datasource.url": { type: "string", desc: "JDBC URL of the database" },
  "spring.datasource.username": { type: "string", desc: "Login username of the database" },
  "spring.datasource.password": { type: "string", desc: "Login password of the database" },
  "spring.datasource.driver-class-name": { type: "string", desc: "JDBC driver class name" },
  "spring.datasource.hikari.maximum-pool-size": { type: "integer", desc: "Maximum pool size", default: "10" },
  "spring.datasource.hikari.minimum-idle": { type: "integer", desc: "Minimum idle connections", default: "10" },
  "spring.datasource.hikari.connection-timeout": { type: "duration", desc: "Connection timeout", default: "30000ms" },
  "spring.datasource.hikari.idle-timeout": { type: "duration", desc: "Idle timeout", default: "600000ms" },

  // JPA Configuration
  "spring.jpa.hibernate.ddl-auto": { type: "string", desc: "DDL mode", enum: ["none", "validate", "update", "create", "create-drop"], default: "none" },
  "spring.jpa.show-sql": { type: "boolean", desc: "Enable SQL logging", default: "false" },
  "spring.jpa.properties.hibernate.dialect": { type: "string", desc: "Hibernate SQL dialect" },
  "spring.jpa.properties.hibernate.format_sql": { type: "boolean", desc: "Format SQL in logs", default: "false" },
  "spring.jpa.properties.hibernate.use_sql_comments": { type: "boolean", desc: "Add SQL comments", default: "false" },

  // Security
  "spring.security.user.name": { type: "string", desc: "Default user name", default: "user" },
  "spring.security.user.password": { type: "string", desc: "Default user password" },
  "spring.security.user.roles": { type: "string", desc: "Granted roles for default user" },

  // Logging
  "logging.level.org.springframework": { type: "string", desc: "Spring Framework log level", enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"], default: "INFO" },
  "logging.level.org.hibernate": { type: "string", desc: "Hibernate log level", enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"], default: "INFO" },
  "logging.level.org.hibernate.SQL": { type: "string", desc: "Hibernate SQL log level", enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"], default: "INFO" },
  "logging.level.org.hibernate.type.descriptor.sql.BasicBinder": { type: "string", desc: "Hibernate parameter log level", enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"], default: "INFO" },
  "logging.level.sql": { type: "string", desc: "SQL log level", enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"], default: "INFO" },
  "logging.level.root": { type: "string", desc: "Root logger level", enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"], default: "INFO" },
  "logging.pattern.console": { type: "string", desc: "Console logging pattern" },
  "logging.pattern.file": { type: "string", desc: "File logging pattern" },
  "logging.file.name": { type: "string", desc: "Log file name" },
  "logging.file.path": { type: "string", desc: "Log file directory" },

  // Actuator
  "management.endpoints.web.exposure.include": { type: "string", desc: "Exposed endpoints", default: "health" },
  "management.endpoints.web.exposure.exclude": { type: "string", desc: "Excluded endpoints" },
  "management.endpoint.health.show-details": { type: "string", desc: "Health details visibility", enum: ["never", "when-authorized", "always"], default: "never" },
  "management.server.port": { type: "integer", desc: "Management server port" },
  "management.server.address": { type: "string", desc: "Management server address" },

  // Cache
  "spring.cache.type": { type: "string", desc: "Cache type", enum: ["generic", "ehcache", "hazelcast", "redis", "simple", "none"] },
  "spring.cache.cache-names": { type: "string", desc: "Cache names to create" },

  // Redis
  "spring.redis.host": { type: "string", desc: "Redis server host", default: "localhost" },
  "spring.redis.port": { type: "integer", desc: "Redis server port", default: "6379" },
  "spring.redis.password": { type: "string", desc: "Redis password" },
  "spring.redis.database": { type: "integer", desc: "Redis database index", default: "0" },
  "spring.redis.timeout": { type: "duration", desc: "Redis connection timeout" },

  // Mail
  "spring.mail.host": { type: "string", desc: "SMTP server host" },
  "spring.mail.port": { type: "integer", desc: "SMTP server port" },
  "spring.mail.username": { type: "string", desc: "SMTP username" },
  "spring.mail.password": { type: "string", desc: "SMTP password" },
  "spring.mail.properties.mail.smtp.auth": { type: "boolean", desc: "Enable SMTP authentication", default: "false" },
  "spring.mail.properties.mail.smtp.starttls.enable": { type: "boolean", desc: "Enable STARTTLS", default: "false" },

  // Web
  "spring.mvc.servlet.path": { type: "string", desc: "Path of the dispatcher servlet", default: "/" },
  "spring.mvc.view.prefix": { type: "string", desc: "Spring MVC view prefix" },
  "spring.mvc.view.suffix": { type: "string", desc: "Spring MVC view suffix" },

  // Jackson
  "spring.jackson.date-format": { type: "string", desc: "Date format string" },
  "spring.jackson.time-zone": { type: "string", desc: "Time zone for formatting dates" },
  "spring.jackson.serialization.write-dates-as-timestamps": { type: "boolean", desc: "Write dates as timestamps", default: "true" },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function log(message, data = null) {
  const logMsg = data ? `[SpringLSP] ${message}: ${JSON.stringify(data)}` : `[SpringLSP] ${message}`;
  connection.console.log(logMsg);
}

function isYamlFile(uri) {
  return /\.(yml|yaml)$/i.test(uri) || /application\.(yml|yaml)$/i.test(uri);
}

function isPropertiesFile(uri) {
  return /\.properties$/i.test(uri) || /application\.properties$/i.test(uri);
}

// =============================================================================
// YAML PROCESSING
// =============================================================================

class YamlProcessor {
  constructor(document) {
    this.document = document;
    this.lines = document.getText().split('\n');
  }

  getExistingProperties() {
    const existingProps = new Set();
    
    try {
      const yamlObj = yaml.load(this.document.getText());
      if (yamlObj && typeof yamlObj === 'object') {
        this._flattenObject(yamlObj, '', existingProps);
      }
    } catch (error) {
      // Parse line by line if YAML is invalid
      this._parseLineByLine(existingProps);
    }
    
    return existingProps;
  }

  _flattenObject(obj, prefix, result) {
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      result.add(fullKey);
      
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        this._flattenObject(value, fullKey, result);
      }
    }
  }

  _parseLineByLine(result) {
    const stack = [];
    
    for (const line of this.lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const indent = line.match(/^(\s*)/)[1].length;
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):\s*(.*)$/);
      
      if (keyMatch) {
        const key = keyMatch[1];
        
        // Adjust stack based on indentation
        while (stack.length > 0 && stack[stack.length - 1].indent >= indent) {
          stack.pop();
        }
        
        stack.push({ key, indent });
        
        // Build full path
        const fullPath = stack.map(item => item.key).join('.');
        result.add(fullPath);
      }
    }
  }

  getContextAtPosition(position) {
    const currentLine = this.lines[position.line];
    const beforeCursor = currentLine.substring(0, position.character);
    const currentIndent = currentLine.match(/^(\s*)/)[1].length;
    
    // Check if typing a property
    const propertyMatch = beforeCursor.match(/^\s*([a-zA-Z0-9._-]*)$/);
    const isTypingProperty = !!propertyMatch;
    const partialText = isTypingProperty ? propertyMatch[1] : '';
    
    // Build parent path
    const parentPath = this._buildParentPath(position.line, currentIndent);
    
    return {
      parentPath,
      currentIndent,
      isTypingProperty,
      partialText,
      isEmptyLine: beforeCursor.trim() === ''
    };
  }

  _buildParentPath(currentLine, currentIndent) {
    const pathParts = [];
    
    for (let i = currentLine - 1; i >= 0; i--) {
      const line = this.lines[i];
      const trimmed = line.trim();
      
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const indent = line.match(/^(\s*)/)[1].length;
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);
      
      if (keyMatch && indent < currentIndent) {
        pathParts.unshift(keyMatch[1]);
        currentIndent = indent;
        if (indent === 0) break;
      }
    }
    
    return pathParts.join('.');
  }

  getAvailableProperties(context, existingProps) {
    const { parentPath, partialText } = context;
    const available = new Map();
    
    // Find all spring properties that could be children
    for (const [propPath, config] of Object.entries(SPRING_PROPS)) {
      let nextKey;
      
      if (parentPath) {
        if (!propPath.startsWith(parentPath + '.')) continue;
        const suffix = propPath.substring(parentPath.length + 1);
        nextKey = suffix.split('.')[0];
      } else {
        nextKey = propPath.split('.')[0];
      }
      
      // Filter by partial text
      if (partialText && !nextKey.toLowerCase().startsWith(partialText.toLowerCase())) {
        continue;
      }
      
      const fullKeyPath = parentPath ? `${parentPath}.${nextKey}` : nextKey;
      
      // Skip if already exists
      if (existingProps.has(fullKeyPath)) continue;
      
      if (!available.has(nextKey)) {
        const isLeafProperty = SPRING_PROPS.hasOwnProperty(fullKeyPath);
        const hasChildren = Object.keys(SPRING_PROPS).some(p => 
          p.startsWith(fullKeyPath + '.') && p !== fullKeyPath
        );
        
        available.set(nextKey, {
          key: nextKey,
          fullPath: fullKeyPath,
          isLeaf: isLeafProperty,
          hasChildren,
          config: SPRING_PROPS[fullKeyPath] || null
        });
      }
    }
    
    return Array.from(available.values());
  }
}

// =============================================================================
// PROPERTIES FILE PROCESSING
// =============================================================================

class PropertiesProcessor {
  constructor(document) {
    this.document = document;
    this.lines = document.getText().split('\n');
  }

  getExistingProperties() {
    const existing = new Set();
    
    for (const line of this.lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      const match = trimmed.match(/^([a-zA-Z0-9._-]+)\s*=/);
      if (match) {
        existing.add(match[1]);
      }
    }
    
    return existing;
  }

  getContextAtPosition(position) {
    const currentLine = this.lines[position.line];
    const beforeCursor = currentLine.substring(0, position.character);
    
    // Check if in value context (after =)
    if (beforeCursor.includes('=')) {
      return { isValue: true, partialText: '' };
    }
    
    // Extract partial property name
    const match = beforeCursor.match(/([a-zA-Z0-9._-]*)$/);
    const partialText = match ? match[1] : '';
    
    return {
      isValue: false,
      partialText,
      isEmptyLine: beforeCursor.trim() === ''
    };
  }

  getAvailableProperties(context, existingProps) {
    const { partialText } = context;
    const available = [];
    
    for (const [propPath, config] of Object.entries(SPRING_PROPS)) {
      // Skip existing properties
      if (existingProps.has(propPath)) continue;
      
      // Filter by partial text
      if (partialText && !propPath.toLowerCase().startsWith(partialText.toLowerCase())) {
        continue;
      }
      
      available.push({
        property: propPath,
        config
      });
    }
    
    return available;
  }
}

// =============================================================================
// COMPLETION PROVIDER
// =============================================================================

function createCompletionItem(label, detail, documentation, insertText, range) {
  const item = CompletionItem.create(label);
  item.kind = CompletionItemKind.Property;
  item.detail = detail;
  item.documentation = {
    kind: MarkupKind.Markdown,
    value: documentation
  };
  
  if (range && insertText) {
    item.textEdit = {
      range,
      newText: insertText
    };
  } else {
    item.insertText = insertText || label;
  }
  
  item.sortText = label;
  return item;
}

function createPropertyDocumentation(propPath, config) {
  let doc = `**${propPath}**\n\n${config.desc}\n\n**Type:** \`${config.type}\``;
  
  if (config.default) {
    doc += `\n\n**Default:** \`${config.default}\``;
  }
  
  if (config.enum) {
    doc += `\n\n**Valid values:** ${config.enum.map(v => `\`${v}\``).join(', ')}`;
  }
  
  return doc;
}

// =============================================================================
// LSP SERVER SETUP
// =============================================================================

connection.onInitialize(() => {
  return {
    capabilities: {
      textDocumentSync: 1,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ['.', ':', '=', ' ']
      },
      hoverProvider: true,
      documentFormattingProvider: true
    }
  };
});

connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  log('Completion request', { 
    uri: params.textDocument.uri, 
    line: params.position.line,
    char: params.position.character
  });

  if (isYamlFile(document.uri)) {
    return handleYamlCompletion(document, params.position);
  } else if (isPropertiesFile(document.uri)) {
    return handlePropertiesCompletion(document, params.position);
  }

  return [];
});

function handleYamlCompletion(document, position) {
  const processor = new YamlProcessor(document);
  const existingProps = processor.getExistingProperties();
  const context = processor.getContextAtPosition(position);
  const availableProps = processor.getAvailableProperties(context, existingProps);
  
  log('YAML completion', {
    context,
    existingCount: existingProps.size,
    availableCount: availableProps.length
  });
  
  const completions = [];
  
  for (const prop of availableProps) {
    let insertText = prop.key;
    let detail = '';
    let documentation = '';
    
    if (prop.config) {
      detail = `${prop.config.type}${prop.config.default ? ` (default: ${prop.config.default})` : ''}`;
      documentation = createPropertyDocumentation(prop.fullPath, prop.config);
      insertText += prop.isLeaf && !prop.hasChildren ? ': ' : ':';
    } else {
      detail = 'Configuration group';
      documentation = `**${prop.fullPath}**\n\nConfiguration group with nested properties`;
      insertText += ':';
    }
    
    // Calculate replacement range
    let startChar = context.currentIndent;
    if (context.isTypingProperty && context.partialText) {
      startChar = position.character - context.partialText.length;
    }
    
    const range = {
      start: { line: position.line, character: startChar },
      end: { line: position.line, character: position.character }
    };
    
    const item = createCompletionItem(prop.key, detail, documentation, insertText, range);
    item.sortText = (prop.isLeaf ? '1' : '2') + '_' + prop.key;
    completions.push(item);
  }
  
  log('YAML completions generated', completions.length);
  return completions;
}

function handlePropertiesCompletion(document, position) {
  const processor = new PropertiesProcessor(document);
  const existingProps = processor.getExistingProperties();
  const context = processor.getContextAtPosition(position);
  
  // Don't complete in value context
  if (context.isValue) {
    log('Properties completion skipped - in value context');
    return [];
  }
  
  const availableProps = processor.getAvailableProperties(context, existingProps);
  
  log('Properties completion', {
    context,
    existingCount: existingProps.size,
    availableCount: availableProps.length
  });
  
  const completions = [];
  
  for (const { property, config } of availableProps) {
    const detail = `${config.type}${config.default ? ` (default: ${config.default})` : ''}`;
    const documentation = createPropertyDocumentation(property, config);
    const insertText = property + '=';
    
    // Calculate replacement range
    let startChar = position.character;
    if (context.partialText) {
      startChar = position.character - context.partialText.length;
    }
    
    const range = {
      start: { line: position.line, character: startChar },
      end: { line: position.line, character: position.character }
    };
    
    const item = createCompletionItem(property, detail, documentation, insertText, range);
    completions.push(item);
  }
  
  log('Properties completions generated', completions.length);
  return completions;
}

// =============================================================================
// OTHER FEATURES
// =============================================================================

connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;

  const lines = document.getText().split('\n');
  const currentLine = lines[params.position.line];
  let propertyPath = '';

  if (isYamlFile(document.uri)) {
    const processor = new YamlProcessor(document);
    const context = processor.getContextAtPosition(params.position);
    const keyMatch = currentLine.match(/^\s*([a-zA-Z0-9._-]+):/);
    
    if (keyMatch) {
      const key = keyMatch[1];
      propertyPath = context.parentPath ? `${context.parentPath}.${key}` : key;
    }
  } else {
    const match = currentLine.match(/^([a-zA-Z0-9._-]+)=/);
    if (match) {
      propertyPath = match[1];
    }
  }

  const config = SPRING_PROPS[propertyPath];
  if (config) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: createPropertyDocumentation(propertyPath, config)
      }
    };
  }

  return null;
});

connection.onDocumentFormatting((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];

  const text = document.getText();

  if (isYamlFile(document.uri)) {
    try {
      const parsed = yaml.load(text);
      const formatted = yaml.dump(parsed, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
        sortKeys: false
      });

      return [{
        range: {
          start: { line: 0, character: 0 },
          end: { line: document.lineCount, character: 0 }
        },
        newText: formatted
      }];
    } catch (error) {
      log('YAML formatting failed', error.message);
      return [];
    }
  } else {
    const lines = text.split('\n');
    const formatted = lines.map(line => {
      if (line.trim() === '' || line.trim().startsWith('#')) {
        return line;
      }
      
      const match = line.match(/^(\s*)([^=]+)=(.*)$/);
      if (match) {
        const [, indent, key, value] = match;
        return `${indent}${key.trim()}=${value.trim()}`;
      }
      
      return line;
    }).join('\n');

    return [{
      range: {
        start: { line: 0, character: 0 },
        end: { line: document.lineCount, character: 0 }
      },
      newText: formatted
    }];
  }
});

// Document change validation
documents.onDidChangeContent((change) => {
  const diagnostics = [];
  
  if (isYamlFile(change.document.uri)) {
    try {
      yaml.load(change.document.getText());
    } catch (error) {
      diagnostics.push({
        severity: 1,
        range: {
          start: {
            line: Math.max(0, (error.mark?.line || 1) - 1),
            character: Math.max(0, (error.mark?.column || 1) - 1)
          },
          end: {
            line: Math.max(0, (error.mark?.line || 1) - 1),
            character: Math.max(0, (error.mark?.column || 1) + 10)
          }
        },
        message: `YAML syntax error: ${error.message}`,
        source: 'spring-properties-lsp'
      });
    }
  }
  
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

documents.onDidClose((e) => {
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// Start the server
documents.listen(connection);
connection.listen();

log('Spring Boot Properties LSP Server started successfully');
