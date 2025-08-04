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
    description:
      "Unconditionally activate the specified comma-separated list of profiles",
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
    description:
      "Maximum number of milliseconds that a client will wait for a connection",
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
    default:
      "%clr(%d{${LOG_DATEFORMAT_PATTERN:-yyyy-MM-dd HH:mm:ss.SSS}}){faint} %clr(${LOG_LEVEL_PATTERN:-%5p}) %clr(${PID:- }){magenta} %clr(---){faint} %clr([%15.15t]){faint} %clr(%-40.40logger{39}){cyan} %clr(:){faint} %m%n${LOG_EXCEPTION_CONVERSION_WORD:-%wEx}",
  },
  "logging.pattern.file": {
    type: "string",
    description: "Appender pattern for output to a file",
    default:
      "%d{${LOG_DATEFORMAT_PATTERN:-yyyy-MM-dd HH:mm:ss.SSS}} ${LOG_LEVEL_PATTERN:-%5p} ${PID:- } --- [%t] %-40.40logger{39} : %m%n${LOG_EXCEPTION_CONVERSION_WORD:-%wEx}",
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
    enum: [
      "generic",
      "ehcache",
      "hazelcast",
      "infinispan",
      "jcache",
      "redis",
      "simple",
      "none",
    ],
  },
  "spring.cache.cache-names": {
    type: "string",
    description:
      "Comma-separated list of cache names to create if supported by the underlying cache manager",
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

/**
 * Debug logging function
 */
function debugLog(message, data = null) {
  if (data) {
    connection.console.log(
      `[DEBUG] ${message}: ${JSON.stringify(data, null, 2)}`,
    );
  } else {
    connection.console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Parse YAML and extract ALL existing property paths
 */
function extractExistingYamlPaths(yamlText) {
  const existingPaths = new Set();

  try {
    const obj = yaml.load(yamlText);
    if (obj && typeof obj === "object") {
      extractPathsFromObject(obj, "", existingPaths);
    }
  } catch (error) {
    // If YAML is invalid, try to parse line by line
    const lines = yamlText.split("\n");
    const pathStack = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const indent = line.match(/^(\s*)/)[1].length;
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);

      if (keyMatch) {
        const key = keyMatch[1];

        // Adjust stack based on indentation
        while (
          pathStack.length > 0 &&
          pathStack[pathStack.length - 1].indent >= indent
        ) {
          pathStack.pop();
        }

        pathStack.push({ key, indent });

        // Build full path
        const fullPath = pathStack.map((item) => item.key).join(".");
        existingPaths.add(fullPath);
      }
    }
  }

  return existingPaths;
}

/**
 * Recursively extract all dot-notation paths from a parsed YAML object
 */
function extractPathsFromObject(obj, prefix, pathSet) {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = prefix ? `${prefix}.${key}` : key;
    pathSet.add(currentPath);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      extractPathsFromObject(value, currentPath, pathSet);
    }
  }
}

/**
 * Get the current YAML context - COMPLETELY REWRITTEN
 */
function getYamlContextAtPosition(document, position) {
  const lines = document.getText().split("\n");
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);

  debugLog("Current line", currentLine);
  debugLog("Before cursor", beforeCursor);

  // Get current indentation
  const currentIndent = currentLine.match(/^(\s*)/)[1].length;

  // Check if user is typing a property name
  const partialMatch = beforeCursor.match(/^\s*([a-zA-Z0-9._-]*)$/);
  const isTypingProperty = partialMatch !== null;
  const partialText = isTypingProperty ? partialMatch[1] : "";

  debugLog("Is typing property", isTypingProperty);
  debugLog("Partial text", partialText);
  debugLog("Current indent", currentIndent);

  // Find parent context by looking backwards
  let parentPath = "";

  for (let i = position.line - 1; i >= 0; i--) {
    const line = lines[i];
    const lineIndent = line.match(/^(\s*)/)[1].length;
    const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);

    if (keyMatch && lineIndent < currentIndent) {
      const key = keyMatch[1];

      // Get the parent path by recursively looking up
      const upperParent = getParentPathAtIndent(lines, i, lineIndent);
      parentPath = upperParent ? `${upperParent}.${key}` : key;
      break;
    }
  }

  debugLog("Found parent path", parentPath);

  return {
    parentPath,
    currentIndent,
    isTypingProperty,
    partialText,
    isEmptyLine: beforeCursor.trim() === "",
  };
}

/**
 * Get parent path at a specific indentation level
 */
function getParentPathAtIndent(lines, startLine, targetIndent) {
  const pathComponents = [];
  let currentIndent = targetIndent;

  for (let i = startLine - 1; i >= 0; i--) {
    const line = lines[i];
    const indent = line.match(/^(\s*)/)[1].length;

    if (indent < currentIndent) {
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);
      if (keyMatch) {
        pathComponents.unshift(keyMatch[1]);
        currentIndent = indent;
        if (indent === 0) break;
      }
    }
  }

  return pathComponents.join(".");
}

/**
 * Find all properties that can be added as siblings
 */
function findYamlSiblings(existingPaths, parentPath, partialText = "") {
  debugLog("Finding siblings for parent", parentPath);
  debugLog("Existing paths", Array.from(existingPaths));
  debugLog("Partial text filter", partialText);

  // Find all Spring properties that match the parent context
  const candidateProps = Object.keys(springProperties).filter((prop) => {
    if (parentPath) {
      return prop.startsWith(parentPath + ".") && !existingPaths.has(prop);
    } else {
      return !existingPaths.has(prop);
    }
  });

  debugLog("Candidate properties", candidateProps);

  // Group by immediate child key
  const siblings = new Map();

  candidateProps.forEach((prop) => {
    let childKey;
    if (parentPath) {
      const suffix = prop.substring(parentPath.length + 1);
      childKey = suffix.split(".")[0];
    } else {
      childKey = prop.split(".")[0];
    }

    // Filter by partial text
    if (
      partialText &&
      !childKey.toLowerCase().startsWith(partialText.toLowerCase())
    ) {
      return;
    }

    const fullChildPath = parentPath ? `${parentPath}.${childKey}` : childKey;

    if (!siblings.has(childKey)) {
      const isLeafProperty = springProperties.hasOwnProperty(fullChildPath);
      const hasNestedProps = candidateProps.some(
        (p) => p.startsWith(fullChildPath + ".") && p !== fullChildPath,
      );

      siblings.set(childKey, {
        key: childKey,
        fullPath: fullChildPath,
        isLeaf: isLeafProperty,
        hasNested: hasNestedProps,
        config: springProperties[fullChildPath] || null,
      });
    }
  });

  const result = Array.from(siblings.values());
  debugLog("Found siblings", result);

  return result;
}

/**
 * Handle Properties file context
 */
function getPropertiesContextAtPosition(document, position) {
  const lines = document.getText().split("\n");
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);

  // Check if we're after an equals sign
  if (beforeCursor.includes("=")) {
    return { isValue: true, partialText: "" };
  }

  // Extract partial property name
  const match = beforeCursor.match(/([a-zA-Z0-9._-]*)$/);
  const partialText = match ? match[1] : "";

  return {
    isValue: false,
    partialText,
    isEmptyLine: beforeCursor.trim() === "",
  };
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
    connection.client.register(
      DidChangeConfigurationNotification.type,
      undefined,
    );
  }
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders((_event) => {
      connection.console.log("Workspace folder change event received.");
    });
  }
});

// =============================================================================
// COMPLETION PROVIDER - COMPLETELY REWRITTEN
// =============================================================================

connection.onCompletion((textDocumentPosition) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    debugLog("No document found");
    return [];
  }

  debugLog("Completion requested", {
    uri: textDocumentPosition.textDocument.uri,
    line: textDocumentPosition.position.line,
    character: textDocumentPosition.position.character,
  });

  const isYaml = isYamlFile(document.uri);

  if (isYaml) {
    return handleYamlCompletion(document, textDocumentPosition);
  } else {
    return handlePropertiesCompletion(document, textDocumentPosition);
  }
});

/**
 * Handle YAML completion - REWRITTEN
 */
function handleYamlCompletion(document, textDocumentPosition) {
  debugLog("Handling YAML completion");

  const context = getYamlContextAtPosition(
    document,
    textDocumentPosition.position,
  );
  const existingPaths = extractExistingYamlPaths(document.getText());

  debugLog("YAML context", context);

  // Find available sibling properties
  const siblings = findYamlSiblings(
    existingPaths,
    context.parentPath,
    context.partialText,
  );

  const completionItems = siblings.map((sibling) => {
    const item = CompletionItem.create(sibling.key);
    item.kind = CompletionItemKind.Property;

    if (sibling.config) {
      item.detail = `${sibling.config.type}${sibling.config.default !== undefined ? ` (default: ${sibling.config.default})` : ""}`;
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: createPropertyDocumentation(sibling.fullPath, sibling.config),
      };
    } else {
      item.detail = "Configuration group";
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: `**${sibling.fullPath}**\n\nConfiguration group with nested properties`,
      };
    }

    // Calculate replacement
    let startChar = context.currentIndent;
    if (context.isTypingProperty && context.partialText) {
      startChar =
        textDocumentPosition.position.character - context.partialText.length;
    }

    // Format the insertion text
    let insertText = sibling.key;
    if (sibling.isLeaf && !sibling.hasNested) {
      insertText += ": ";
    } else {
      insertText += ":";
    }

    item.textEdit = {
      range: {
        start: {
          line: textDocumentPosition.position.line,
          character: startChar,
        },
        end: textDocumentPosition.position,
      },
      newText: insertText,
    };

    // Sort order
    item.sortText = `${sibling.isLeaf ? "1" : "2"}_${sibling.key}`;

    return item;
  });

  debugLog("Generated YAML completion items", completionItems.length);
  return completionItems;
}

/**
 * Handle Properties completion - REWRITTEN
 */
function handlePropertiesCompletion(document, textDocumentPosition) {
  debugLog("Handling Properties completion");

  const context = getPropertiesContextAtPosition(
    document,
    textDocumentPosition.position,
  );

  debugLog("Properties context", context);

  // Don't complete values, only property names
  if (context.isValue) {
    debugLog("In value context, no completion");
    return [];
  }

  // Find matching properties
  const matches = Object.keys(springProperties)
    .filter((prop) => {
      if (!context.partialText) return true;
      return prop.toLowerCase().startsWith(context.partialText.toLowerCase());
    })
    .map((prop) => ({
      property: prop,
      config: springProperties[prop],
    }));

  debugLog("Found property matches", matches.length);

  const completionItems = matches.map((match) => {
    const item = CompletionItem.create(match.property);
    item.kind = CompletionItemKind.Property;
    item.detail = `${match.config.type}${match.config.default !== undefined ? ` (default: ${match.config.default})` : ""}`;
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: createPropertyDocumentation(match.property, match.config),
    };

    // Calculate replacement range
    let startChar = textDocumentPosition.position.character;
    if (context.partialText) {
      startChar =
        textDocumentPosition.position.character - context.partialText.length;
    }

    item.textEdit = {
      range: {
        start: {
          line: textDocumentPosition.position.line,
          character: startChar,
        },
        end: textDocumentPosition.position,
      },
      newText: match.property + "=",
    };

    item.sortText = match.property;

    return item;
  });

  debugLog("Generated Properties completion items", completionItems.length);
  return completionItems;
}

/**
 * Create property documentation
 */
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

  const isYaml = isYamlFile(document.uri);
  let propertyPath = "";

  if (isYaml) {
    const context = getYamlContextAtPosition(document, params.position);
    const lines = document.getText().split("\n");
    const currentLine = lines[params.position.line];
    const keyMatch = currentLine.match(/^\s*([a-zA-Z0-9._-]+):/);

    if (keyMatch) {
      const key = keyMatch[1];
      propertyPath = context.parentPath ? `${context.parentPath}.${key}` : key;
    }
  } else {
    const context = getPropertiesContextAtPosition(document, params.position);
    const lines = document.getText().split("\n");
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

// Document formatting
connection.onDocumentFormatting((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

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

// Validate documents
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

connection.console.log(
  "Spring Boot Properties LSP Server started with enhanced debugging and fixed completion logic",
);
