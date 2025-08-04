#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  MarkupKind,
} = require("vscode-languageserver/node");
const { TextDocument } = require("vscode-languageserver-textdocument");
const yaml = require("js-yaml");

// =================== SPRING PROPERTIES DATABASE ===================

const springProperties = {
  // Server properties
  "server.port": {
    type: "integer",
    description: "Server HTTP port",
    default: 8080,
  },
  "server.servlet.context-path": {
    type: "string",
    description: "Context path of the application",
    default: "/",
  },
  "server.servlet.session.timeout": {
    type: "duration",
    description: "Session timeout",
    default: "30m",
  },
  "server.compression.enabled": {
    type: "boolean",
    description: "Whether response compression is enabled",
    default: false,
  },
  "server.ssl.enabled": {
    type: "boolean",
    description: "Whether to enable SSL support",
    default: false,
  },
  "server.ssl.key-store": {
    type: "string",
    description: "Path to the key store that holds the SSL certificate",
  },
  "server.ssl.key-store-password": {
    type: "string",
    description: "Password used to access the key store",
  },
  "server.error.whitelabel.enabled": {
    type: "boolean",
    description: "Whether to enable the default error page",
    default: true,
  },

  // Spring properties
  "spring.application.name": {
    type: "string",
    description: "Application name",
  },
  "spring.profiles.active": {
    type: "string",
    description: "Comma-separated list of active profiles",
  },
  "spring.profiles.include": {
    type: "string",
    description: "Unconditionally activate the specified comma-separated list of profiles",
  },
  "spring.main.banner-mode": {
    type: "string",
    description: "Mode used to display the banner when the application runs",
    enum: ["console", "log", "off"],
    default: "console",
  },

  // Database properties
  "spring.datasource.url": {
    type: "string",
    description: "JDBC URL of the database",
  },
  "spring.datasource.username": {
    type: "string",
    description: "Login username of the database",
  },
  "spring.datasource.password": {
    type: "string",
    description: "Login password of the database",
  },
  "spring.datasource.driver-class-name": {
    type: "string",
    description: "Fully qualified name of the JDBC driver",
  },
  "spring.datasource.hikari.maximum-pool-size": {
    type: "integer",
    description: "Maximum number of connections in the pool",
    default: 10,
  },
  "spring.datasource.hikari.minimum-idle": {
    type: "integer",
    description: "Minimum number of idle connections maintained by HikariCP",
    default: 10,
  },
  "spring.datasource.hikari.connection-timeout": {
    type: "duration",
    description: "Maximum number of milliseconds that a client will wait for a connection",
    default: "30000ms",
  },

  // JPA properties
  "spring.jpa.hibernate.ddl-auto": {
    type: "string",
    description: "DDL mode",
    enum: ["none", "validate", "update", "create", "create-drop"],
    default: "none",
  },
  "spring.jpa.show-sql": {
    type: "boolean",
    description: "Whether to enable logging of SQL statements",
    default: false,
  },
  "spring.jpa.properties.hibernate.dialect": {
    type: "string",
    description: "Hibernate SQL dialect",
  },
  "spring.jpa.properties.hibernate.format_sql": {
    type: "boolean",
    description: "Whether to format SQL in logs",
    default: false,
  },

  // Security properties
  "spring.security.user.name": {
    type: "string",
    description: "Default user name",
    default: "user",
  },
  "spring.security.user.password": {
    type: "string",
    description: "Password for the default user name",
  },
  "spring.security.oauth2.client.registration.google.client-id": {
    type: "string",
    description: "OAuth2 client ID for Google",
  },
  "spring.security.oauth2.client.registration.google.client-secret": {
    type: "string",
    description: "OAuth2 client secret for Google",
  },

  // Logging properties
  "logging.level.org.springframework": {
    type: "string",
    description: "Log level for Spring Framework",
    enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF"],
    default: "INFO",
  },
  "logging.level.org.hibernate": {
    type: "string",
    description: "Log level for Hibernate",
    enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF"],
    default: "INFO",
  },
  "logging.level.sql": {
    type: "string",
    description: "Log level for SQL",
    enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF"],
    default: "INFO",
  },
  "logging.pattern.console": {
    type: "string",
    description: "Appender pattern for output to the console",
    default: "%clr(%d{${LOG_DATEFORMAT_PATTERN:-yyyy-MM-dd HH:mm:ss.SSS}}){faint} %clr(${LOG_LEVEL_PATTERN:-%5p}) %clr(${PID:- }){magenta} %clr(---){faint} %clr([%15.15t]){faint} %clr(%-40.40logger{39}){cyan} %clr(:){faint} %m%n${LOG_EXCEPTION_CONVERSION_WORD:-%wEx}",
  },
  "logging.pattern.file": {
    type: "string",
    description: "Appender pattern for output to a file",
    default: "%d{${LOG_DATEFORMAT_PATTERN:-yyyy-MM-dd HH:mm:ss.SSS}} ${LOG_LEVEL_PATTERN:-%5p} ${PID:- } --- [%t] %-40.40logger{39} : %m%n${LOG_EXCEPTION_CONVERSION_WORD:-%wEx}",
  },
  "logging.file.name": {
    type: "string",
    description: "Log file name (for instance, `myapp.log`)",
  },
  "logging.file.path": {
    type: "string",
    description: "Location of the log file",
  },

  // Actuator properties
  "management.endpoints.web.exposure.include": {
    type: "string",
    description: "Endpoint IDs that should be included or '*' for all",
    default: "health",
  },
  "management.endpoint.health.show-details": {
    type: "string",
    description: "When to show full health details",
    enum: ["never", "when-authorized", "always"],
    default: "never",
  },
  "management.server.port": {
    type: "integer",
    description: "Management endpoint HTTP port",
  },

  // Cache properties
  "spring.cache.type": {
    type: "string",
    description: "Cache type",
    enum: ["generic", "ehcache", "hazelcast", "infinispan", "jcache", "redis", "simple", "none"],
  },
  "spring.cache.cache-names": {
    type: "string",
    description: "Comma-separated list of cache names to create if supported by the underlying cache manager",
  },

  // Redis properties
  "spring.redis.host": {
    type: "string",
    description: "Redis server host",
    default: "localhost",
  },
  "spring.redis.port": {
    type: "integer",
    description: "Redis server port",
    default: 6379,
  },
  "spring.redis.password": {
    type: "string",
    description: "Login password of the redis server",
  },
  "spring.redis.database": {
    type: "integer",
    description: "Database index used by the connection factory",
    default: 0,
  },

  // Mail properties
  "spring.mail.host": {
    type: "string",
    description: "SMTP server host",
  },
  "spring.mail.port": {
    type: "integer",
    description: "SMTP server port",
  },
  "spring.mail.username": {
    type: "string",
    description: "Login user of the SMTP server",
  },
  "spring.mail.password": {
    type: "string",
    description: "Login password of the SMTP server",
  },
  "spring.mail.properties.mail.smtp.auth": {
    type: "boolean",
    description: "Whether to enable SMTP authentication",
    default: false,
  },
  "spring.mail.properties.mail.smtp.starttls.enable": {
    type: "boolean",
    description: "Whether to enable STARTTLS",
    default: false,
  },
};

/* -------------------- UTILITY FUNCTIONS -------------------- */

function isPropertiesFile(uri) {
  return uri.endsWith(".properties") || uri.includes("application.properties");
}

function isYamlFile(uri) {
  return (
    uri.endsWith(".yml") ||
    uri.endsWith(".yaml") ||
    uri.includes("application.yml") ||
    uri.includes("application.yaml")
  );
}

function extractExistingYamlPaths(yamlText) {
  const existingPaths = new Set();
  try {
    const obj = yaml.load(yamlText);
    if (obj && typeof obj === 'object') {
      extractPathsFromObject(obj, '', existingPaths);
    }
  } catch (error) {
    const lines = yamlText.split('\n');
    const pathStack = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const indent = line.match(/^(\s*)/)[1].length;
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):\s*(.*)$/);
      if (keyMatch) {
        const key = keyMatch[1];
        while (pathStack.length > 0 && pathStack[pathStack.length - 1].indent >= indent) {
          pathStack.pop();
        }
        pathStack.push({ key, indent });
        const fullPath = pathStack.map(item => item.key).join('.');
        existingPaths.add(fullPath);
      }
    }
  }
  return existingPaths;
}

function extractPathsFromObject(obj, prefix, pathSet) {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    pathSet.add(currentPath);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      extractPathsFromObject(value, currentPath, pathSet);
    }
  }
}

function getYamlContextAtPosition(document, position) {
  const lines = document.getText().split('\n');
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);
  const currentIndent = currentLine.match(/^(\s*)/)[1].length;
  const isEmptyLine = beforeCursor.trim() === '';
  const partialMatch = beforeCursor.match(/^\s*([a-zA-Z0-9._-]*)$/);
  const isTypingProperty = partialMatch !== null;
  const partialText = isTypingProperty ? partialMatch[1] : '';
  const parentPath = buildYamlParentPath(lines, position.line, currentIndent);
  return {
    parentPath,
    currentIndent,
    isTypingProperty,
    partialText,
    isEmptyLine,
    isAtStartOfLine: beforeCursor.match(/^\s*$/),
  };
}

function buildYamlParentPath(lines, currentLine, currentIndent) {
  const pathStack = [];
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const lineIndent = line.match(/^(\s*)/)[1].length;
    const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):\s*(.*)$/);
    if (keyMatch && lineIndent < currentIndent) {
      const key = keyMatch[1];
      pathStack.unshift(key);
      currentIndent = lineIndent;
      if (lineIndent === 0) break;
    }
  }
  return pathStack.join('.');
}

/**
 * FIXED: Suggests properties for YAML, including all siblings/children not yet present under the parent.
 */
function findAvailableYamlProperties(existingPaths, parentPath, partialText = '') {
  const allProps = Object.keys(springProperties);

  // Gather all properties that are direct children of parentPath
  const children = new Map();
  const parentPrefix = parentPath ? parentPath + '.' : '';
  const parentDepth = parentPath ? parentPath.split('.').length : 0;

  for (const prop of allProps) {
    if (!prop.startsWith(parentPrefix)) continue;
    const parts = prop.split('.');
    if (parts.length <= parentDepth) continue; // Not a child
    const childKey = parts[parentDepth];
    const childFullPath = parentPrefix + childKey;
    // Only suggest if this direct child is not already present
    if (existingPaths.has(childFullPath)) continue;
    if (partialText && !childKey.toLowerCase().startsWith(partialText.toLowerCase())) continue;
    if (!children.has(childKey)) {
      const isDirectProperty = springProperties.hasOwnProperty(childFullPath);
      const hasChildren = allProps.some(
        p => p.startsWith(childFullPath + '.') && p !== childFullPath
      );
      children.set(childKey, {
        key: childKey,
        fullPath: childFullPath,
        isDirectProperty,
        hasChildren,
        config: springProperties[childFullPath] || null
      });
    }
  }
  return Array.from(children.values());
}

function getPropertiesContextAtPosition(document, position) {
  const lines = document.getText().split('\n');
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);
  const equalsIndex = beforeCursor.indexOf('=');
  if (equalsIndex !== -1) {
    return {
      isValue: true,
      partialText: '',
      propertyName: beforeCursor.substring(0, equalsIndex).trim(),
    };
  }
  const match = beforeCursor.match(/([a-zA-Z0-9._-]*)$/);
  const partialText = match ? match[1] : '';
  return {
    isValue: false,
    partialText,
    isEmptyLine: beforeCursor.trim() === '',
    isAtStartOfLine: beforeCursor.match(/^\s*[a-zA-Z0-9._-]*$/) !== null,
  };
}

function findAvailablePropertiesFileProps(existingProps, partialText = '') {
  const allSpringProps = Object.keys(springProperties);
  return allSpringProps.filter((prop) => {
    if (existingProps.has(prop)) return false;
    if (partialText && !prop.toLowerCase().startsWith(partialText.toLowerCase()))
      return false;
    return true;
  });
}

function extractExistingPropertiesFilePaths(propertiesText) {
  const existingProps = new Set();
  const lines = propertiesText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([a-zA-Z0-9._-]+)\s*=/);
    if (match) {
      existingProps.add(match[1]);
    }
  }
  return existingProps;
}

/* -------------------- LSP SERVER INITIALIZATION -------------------- */

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params) => {
  const capabilities = params.capabilities;
  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );
  hasDiagnosticRelatedInformationCapability = !!(
    capabilities.textDocument &&
    capabilities.textDocument.publishDiagnostics &&
    capabilities.textDocument.publishDiagnostics.relatedInformation
  );
  const result = {
    capabilities: {
      textDocumentSync: 1,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [".", ":", "=", "-", " "],
      },
      hoverProvider: true,
      documentSymbolProvider: true,
      definitionProvider: false,
      referencesProvider: false,
      documentHighlightProvider: false,
      codeActionProvider: false,
      documentFormattingProvider: true,
    },
  };
  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }
  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

/* -------------------- COMPLETION PROVIDER -------------------- */

connection.onCompletion((textDocumentPosition) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) return [];
  const isYaml = isYamlFile(document.uri);
  if (isYaml) {
    return handleYamlCompletion(document, textDocumentPosition);
  } else {
    return handlePropertiesCompletion(document, textDocumentPosition);
  }
});

function handleYamlCompletion(document, textDocumentPosition) {
  const context = getYamlContextAtPosition(document, textDocumentPosition.position);
  const existingPaths = extractExistingYamlPaths(document.getText());
  const availableProps = findAvailableYamlProperties(
    existingPaths,
    context.parentPath,
    context.partialText
  );
  const completionItems = availableProps.map((prop) => {
    const item = CompletionItem.create(prop.key);
    item.kind = CompletionItemKind.Property;
    item.label = prop.key;
    item.insertText = prop.key;
    if (prop.config) {
      item.detail = `${prop.config.type}${
        prop.config.default !== undefined ? ` (default: ${prop.config.default})` : ''
      }`;
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: createPropertyDocumentation(prop.fullPath, prop.config),
      };
    } else {
      item.detail = "Configuration group";
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: `**${prop.fullPath}**\n\nConfiguration group with nested properties`,
      };
    }
    let replaceStartChar = textDocumentPosition.position.character;
    if (context.isTypingProperty && context.partialText) {
      replaceStartChar = textDocumentPosition.position.character - context.partialText.length;
    }
    let insertionText = prop.key + ': ';
    if (!prop.isDirectProperty && prop.hasChildren) insertionText = prop.key + ':';
    item.textEdit = {
      range: {
        start: { line: textDocumentPosition.position.line, character: replaceStartChar },
        end: { line: textDocumentPosition.position.line, character: textDocumentPosition.position.character },
      },
      newText: insertionText,
    };
    item.sortText = `${prop.isDirectProperty ? '1' : '2'}_${prop.key}`;
    return item;
  });
  return completionItems;
}

function handlePropertiesCompletion(document, textDocumentPosition) {
  const context = getPropertiesContextAtPosition(document, textDocumentPosition.position);
  if (context.isValue) return [];
  const existingProps = extractExistingPropertiesFilePaths(document.getText());
  const availableProps = findAvailablePropertiesFileProps(existingProps, context.partialText);
  const completionItems = availableProps.map((propName) => {
    const config = springProperties[propName];
    if (!config) return null;
    const item = CompletionItem.create(propName);
    item.kind = CompletionItemKind.Property;
    item.label = propName;
    item.insertText = propName + "=";
    item.detail = `${config.type}${
      config.default !== undefined ? ` (default: ${config.default})` : ''
    }`;
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: createPropertyDocumentation(propName, config),
    };
    let replaceStartChar = textDocumentPosition.position.character;
    if (context.partialText) {
      replaceStartChar = textDocumentPosition.position.character - context.partialText.length;
    }
    item.textEdit = {
      range: {
        start: {
          line: textDocumentPosition.position.line,
          character: replaceStartChar,
        },
        end: {
          line: textDocumentPosition.position.line,
          character: textDocumentPosition.position.character,
        },
      },
      newText: propName + "=",
    };
    item.sortText = propName;
    return item;
  }).filter(item => item !== null);
  return completionItems;
}

function createPropertyDocumentation(property, config) {
  let documentation = `**${property}**\n\n${config.description}\n\n**Type:** \`${config.type}\``;
  if (config.default !== undefined) {
    documentation += `\n\n**Default:** \`${config.default}\``;
  }
  if (config.enum) {
    documentation += `\n\n**Valid values:** ${config.enum.map((v) => `\`${v}\``).join(", ")}`;
  }
  return documentation;
}

connection.onCompletionResolve((item) => item);

/* -------------------- OTHER LSP FEATURES -------------------- */

connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  const isYaml = isYamlFile(document.uri);
  let propertyPath = '';
  if (isYaml) {
    const context = getYamlContextAtPosition(document, params.position);
    const lines = document.getText().split('\n');
    const currentLine = lines[params.position.line];
    const keyMatch = currentLine.match(/^\s*([a-zA-Z0-9._-]+):/);
    if (keyMatch) {
      const key = keyMatch[1];
      propertyPath = context.parentPath ? `${context.parentPath}.${key}` : key;
    }
  } else {
    const lines = document.getText().split('\n');
    const currentLine = lines[params.position.line];
    const match = currentLine.match(/^([a-zA-Z0-9._-]+)=/);
    if (match) {
      propertyPath = match[1];
    }
  }
  const config = springProperties[propertyPath];
  if (config) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: createPropertyDocumentation(propertyPath, config),
      },
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
        sortKeys: false,
      });
      return [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: document.lineCount, character: 0 },
          },
          newText: formatted,
        },
      ];
    } catch (error) {
      connection.console.log(`YAML formatting error: ${error.message}`);
      return [];
    }
  } else {
    const lines = text.split("\n");
    const formatted = lines
      .map((line) => {
        if (line.trim() === "" || line.trim().startsWith("#")) {
          return line;
        }
        const match = line.match(/^(\s*)([^=]+)=(.*)$/);
        if (match) {
          const [, indent, key, value] = match;
          return `${indent}${key.trim()}=${value.trim()}`;
        }
        return line;
      })
      .join("\n");
    return [
      {
        range: {
          start: { line: 0, character: 0 },
          end: { line: document.lineCount, character: 0 },
        },
        newText: formatted,
      },
    ];
  }
});

function validateDocument(document) {
  const diagnostics = [];
  const text = document.getText();
  if (isYamlFile(document.uri)) {
    try {
      yaml.load(text);
    } catch (error) {
      diagnostics.push({
        severity: 1,
        range: {
          start: {
            line: (error.mark?.line || 1) - 1,
            character: (error.mark?.column || 1) - 1,
          },
          end: {
            line: (error.mark?.line || 1) - 1,
            character: (error.mark?.column || 1) + 10,
          },
        },
        message: `YAML syntax error: ${error.message}`,
        source: "spring-properties-lsp",
      });
    }
  }
  return diagnostics;
}

documents.onDidChangeContent((change) => {
  const diagnostics = validateDocument(change.document);
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});
documents.onDidClose((e) => {
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});
documents.listen(connection);
connection.listen();

connection.console.log("Spring Boot Properties LSP Server started with improved completion logic and correct sibling/child suggestions.");
