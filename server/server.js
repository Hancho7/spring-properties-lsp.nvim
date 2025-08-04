#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  Hover,
  MarkupKind,
} = require("vscode-languageserver/node");
const { TextDocument } = require("vscode-languageserver-textdocument");
const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// Spring Boot properties database
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

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if the given URI represents a properties file
 */
function isPropertiesFile(uri) {
  return uri.endsWith(".properties") || uri.includes("application.properties");
}

/**
 * Check if the given URI represents a YAML file
 */
function isYamlFile(uri) {
  return (
    uri.endsWith(".yml") ||
    uri.endsWith(".yaml") ||
    uri.includes("application.yml") ||
    uri.includes("application.yaml")
  );
}

/**
 * Find all Spring Boot properties that match the given prefix
 */
function findMatchingProperties(prefix) {
  return Object.keys(springProperties)
    .filter((key) => key.startsWith(prefix.toLowerCase()))
    .map((key) => ({
      property: key,
      config: springProperties[key],
    }));
}

/**
 * Parse YAML document and extract existing property paths
 */
function parseExistingYamlProperties(yamlText) {
  const existingPaths = new Set();

  try {
    const lines = yamlText.split('\n');
    const pathStack = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const indent = line.match(/^(\s*)/)[1].length;
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);

      if (keyMatch) {
        const key = keyMatch[1];

        // Adjust stack based on indentation
        while (pathStack.length > 0 && pathStack[pathStack.length - 1].indent >= indent) {
          pathStack.pop();
        }

        // Add current key to stack
        pathStack.push({ key, indent });

        // Build full path
        const fullPath = pathStack.map(item => item.key).join('.');
        existingPaths.add(fullPath);
      }
    }
  } catch (error) {
    // If parsing fails, return empty set
  }

  return existingPaths;
}

/**
 * Get the current YAML context and indentation for completion
 */
function getYamlCompletionContext(document, position) {
  const lines = document.getText().split('\n');
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);

  // Get current indentation
  const currentIndent = currentLine.match(/^(\s*)/)[1].length;

  // Check if we're on an empty line or starting a new property
  const isEmptyLine = beforeCursor.trim() === '';
  const isPartialProperty = /([a-zA-Z0-9._-]+)$/.test(beforeCursor);

  // Find the parent context by looking at previous lines
  let parentPath = '';
  let parentIndent = -1;

  for (let i = position.line - 1; i >= 0; i--) {
    const line = lines[i];
    const lineIndent = line.match(/^(\s*)/)[1].length;
    const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);

    if (keyMatch && lineIndent < currentIndent) {
      // Found a parent key
      const key = keyMatch[1];

      // Build parent path by going further up if needed
      const upperPath = getYamlPathAtLine(lines, i);
      parentPath = upperPath ? `${upperPath}.${key}` : key;
      parentIndent = lineIndent;
      break;
    }
  }

  return {
    parentPath,
    currentIndent,
    parentIndent,
    isEmptyLine,
    isPartialProperty,
    partialText: isPartialProperty ? beforeCursor.match(/([a-zA-Z0-9._-]+)$/)[1] : '',
  };
}

/**
 * Get the full YAML path at a specific line
 */
function getYamlPathAtLine(lines, lineIndex) {
  const targetLine = lines[lineIndex];
  const targetIndent = targetLine.match(/^(\s*)/)[1].length;
  const path = [];

  // Extract key from target line
  const keyMatch = targetLine.match(/^\s*([a-zA-Z0-9._-]+):/);
  if (keyMatch) {
    path.unshift(keyMatch[1]);
  }

  // Go up the hierarchy
  let currentIndent = targetIndent;
  for (let i = lineIndex - 1; i >= 0; i--) {
    const line = lines[i];
    const indent = line.match(/^(\s*)/)[1].length;

    if (indent < currentIndent) {
      const match = line.match(/^\s*([a-zA-Z0-9._-]+):/);
      if (match) {
        path.unshift(match[1]);
        currentIndent = indent;
      }
    }
  }

  return path.slice(0, -1).join('.'); // Remove the last element as it's the current key
}

/**
 * Find properties that can be added as siblings to existing YAML structure
 */
function findAvailableSiblingProperties(existingPaths, parentPath, currentIndent) {
  // Find all properties that start with the parent path
  const possibleProperties = Object.keys(springProperties).filter(prop => {
    if (parentPath) {
      return prop.startsWith(parentPath + '.');
    }
    return true;
  });

  // Filter out properties that already exist
  const availableProperties = possibleProperties.filter(prop => {
    return !existingPaths.has(prop);
  });

  // Group by immediate children of parent path
  const siblingGroups = new Map();

  availableProperties.forEach(prop => {
    let relativeProp = prop;
    if (parentPath) {
      relativeProp = prop.substring(parentPath.length + 1);
    }

    const nextKey = relativeProp.split('.')[0];
    const fullChildPath = parentPath ? `${parentPath}.${nextKey}` : nextKey;

    if (!siblingGroups.has(nextKey)) {
      siblingGroups.set(nextKey, {
        key: nextKey,
        fullPath: fullChildPath,
        hasChildren: relativeProp.includes('.'),
        directProperty: availableProperties.find(p => p === fullChildPath)
      });
    }
  });

  return Array.from(siblingGroups.values());
}

/**
 * Get the property being typed at the current cursor position
 */
function getPropertyAtPosition(document, position) {
  const text = document.getText();
  const lines = text.split("\n");
  const line = lines[position.line];

  if (isYamlFile(document.uri)) {
    const context = getYamlCompletionContext(document, position);

    if (context.isPartialProperty) {
      // User is typing a property name
      return context.partialText;
    } else if (context.parentPath) {
      // User is in a nested context
      return context.parentPath;
    }

    return '';
  } else {
    // Properties file handling
    const beforeCursor = line.substring(0, position.character);
    const match = beforeCursor.match(/([a-zA-Z0-9._-]+)$/);
    return match ? match[1] : "";
  }
}

// =============================================================================
// LSP SERVER INITIALIZATION
// =============================================================================

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
      textDocumentSync: 1, // Full document sync
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

// =============================================================================
// COMPLETION PROVIDER - ENHANCED LOGIC
// =============================================================================

/**
 * Main completion handler with improved YAML sibling support
 *
 * LOGIC FLOW:
 * 1. Get document and validate it exists
 * 2. Determine file type and completion context
 * 3. For YAML: Parse existing structure and find available siblings
 * 4. For Properties: Handle simple key=value format
 * 5. Create intelligent completion suggestions
 * 6. Return formatted completion items
 */
connection.onCompletion((textDocumentPosition) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    return [];
  }

  const isYaml = isYamlFile(document.uri);

  if (isYaml) {
    return handleYamlCompletion(document, textDocumentPosition);
  } else {
    return handlePropertiesCompletion(document, textDocumentPosition);
  }
});

/**
 * Handle completion for YAML files with smart sibling detection
 */
function handleYamlCompletion(document, textDocumentPosition) {
  const context = getYamlCompletionContext(document, textDocumentPosition);
  const existingPaths = parseExistingYamlProperties(document.getText());

  // Find available sibling properties
  const availableSiblings = findAvailableSiblingProperties(
    existingPaths,
    context.parentPath,
    context.currentIndent
  );

  let completionItems = [];

  if (context.isPartialProperty) {
    // User is typing a property name - filter siblings by what they've typed
    const filteredSiblings = availableSiblings.filter(sibling =>
      sibling.key.toLowerCase().startsWith(context.partialText.toLowerCase())
    );

    completionItems = filteredSiblings.map(sibling =>
      createYamlSiblingCompletionItem(sibling, context, textDocumentPosition)
    );
  } else if (context.isEmptyLine) {
    // User is on an empty line - show all available siblings
    completionItems = availableSiblings.map(sibling =>
      createYamlSiblingCompletionItem(sibling, context, textDocumentPosition)
    );
  } else {
    // Fallback to traditional property matching
    const property = getPropertyAtPosition(document, textDocumentPosition.position);
    const matches = findMatchingProperties(property);

    completionItems = matches.map(match =>
      createTraditionalYamlCompletionItem(match, document, textDocumentPosition)
    );
  }

  return completionItems;
}

/**
 * Create completion item for YAML sibling properties
 */
function createYamlSiblingCompletionItem(sibling, context, textDocumentPosition) {
  const item = CompletionItem.create(sibling.key);
  item.kind = CompletionItemKind.Property;

  // Get property configuration if it exists
  const config = springProperties[sibling.fullPath];
  if (config) {
    item.detail = config.type;
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: createPropertyDocumentation(sibling.fullPath, config),
    };
  } else {
    item.detail = "object";
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: `**${sibling.fullPath}**\n\nConfiguration group`,
    };
  }

  // Calculate the replacement range
  const startChar = context.isPartialProperty ?
    textDocumentPosition.position.character - context.partialText.length :
    context.currentIndent;

  const newText = sibling.hasChildren && !sibling.directProperty ?
    `${sibling.key}:` :
    `${sibling.key}: `;

  item.textEdit = {
    range: {
      start: {
        line: textDocumentPosition.position.line,
        character: startChar
      },
      end: textDocumentPosition.position,
    },
    newText: newText,
  };

  // Set sort priority (existing siblings should appear first)
  item.sortText = `1_${sibling.key}`;

  return item;
}

/**
 * Create traditional YAML completion item (for full property paths)
 */
function createTraditionalYamlCompletionItem(match, document, textDocumentPosition) {
  const item = CompletionItem.create(match.property);
  item.kind = CompletionItemKind.Property;
  item.detail = match.config.type;
  item.documentation = {
    kind: MarkupKind.Markdown,
    value: createPropertyDocumentation(match.property, match.config),
  };

  // Convert to YAML structure
  const yamlPath = convertToYamlPath(match.property);
  item.insertText = yamlPath;

  const line = document.getText().split("\n")[textDocumentPosition.position.line];
  const beforeCursor = line.substring(0, textDocumentPosition.position.character);

  const matchResult = beforeCursor.match(/([\w.]*)$/);
  if (matchResult) {
    item.textEdit = {
      range: {
        start: {
          line: textDocumentPosition.position.line,
          character: textDocumentPosition.position.character - matchResult[1].length,
        },
        end: textDocumentPosition.position,
      },
      newText: yamlPath,
    };
  }

  item.sortText = `2_${match.property}`;
  return item;
}

/**
 * Handle completion for Properties files
 */
function handlePropertiesCompletion(document, textDocumentPosition) {
  const property = getPropertyAtPosition(document, textDocumentPosition);
  const matches = findMatchingProperties(property);

  return matches.map((match) => {
    const item = CompletionItem.create(match.property);
    item.kind = CompletionItemKind.Property;
    item.detail = match.config.type;
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: createPropertyDocumentation(match.property, match.config),
    };

    const line = document.getText().split("\n")[textDocumentPosition.position.line];
    const beforeCursor = line.substring(0, textDocumentPosition.position.character);
    const matchResult = beforeCursor.match(/([a-zA-Z0-9._-]*)$/);

    if (matchResult) {
      item.textEdit = {
        range: {
          start: {
            line: textDocumentPosition.position.line,
            character: textDocumentPosition.position.character - matchResult[1].length,
          },
          end: textDocumentPosition.position,
        },
        newText: match.property + "=",
      };
    }

    return item;
  });
}

/**
 * Convert dot notation property to YAML hierarchical structure
 */
function convertToYamlPath(property) {
  const parts = property.split(".");
  let yamlPath = "";
  let indent = 0;

  for (let i = 0; i < parts.length; i++) {
    yamlPath += " ".repeat(indent) + parts[i] + ":";
    if (i < parts.length - 1) {
      yamlPath += "\n";
      indent += 2;
    } else {
      yamlPath += " ";
    }
  }

  return yamlPath;
}

/**
 * Create rich markdown documentation for a property
 */
function createPropertyDocumentation(property, config) {
  let documentation = `**${property}**\n\n${config.description}\n\n**Type:** ${config.type}`;

  if (config.default !== undefined) {
    documentation += `\n\n**Default:** \`${config.default}\``;
  }

  if (config.enum) {
    documentation += `\n\n**Valid values:** ${config.enum.map((v) => `\`${v}\``).join(", ")}`;
  }

  return documentation;
}

// Completion resolve
connection.onCompletionResolve((item) => {
  return item;
});

// =============================================================================
// OTHER LSP FEATURES
// =============================================================================

// Hover provider
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const property = getPropertyAtPosition(document, params.position);
  const config = springProperties[property.toLowerCase()];

  if (config) {
    return {
      contents: {
        kind: MarkupKind.Markdown,
        value: createPropertyDocumentation(property, config),
      },
    };
  }

  return null;
});

// Document formatting
connection.onDocumentFormatting((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();

  if (isYamlFile(document.uri)) {
    try {
      // Parse and reformat YAML
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
    // Format properties file
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

// Validate documents
function validateDocument(document) {
  const diagnostics = [];
  const text = document.getText();

  if (isYamlFile(document.uri)) {
    try {
      yaml.load(text);
    } catch (error) {
      diagnostics.push({
        severity: 1, // Error
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

// Document change events
documents.onDidChangeContent((change) => {
  const diagnostics = validateDocument(change.document);
  connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
});

documents.onDidClose((e) => {
  connection.sendDiagnostics({ uri: e.document.uri, diagnostics: [] });
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();

connection.console.log("Spring Boot Properties LSP Server starte
