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
 * Extract all existing YAML property paths from the document
 */
function extractExistingYamlPaths(yamlText) {
  const existingPaths = new Set();

  try {
    const obj = yaml.load(yamlText);
    if (obj && typeof obj === "object") {
      extractPathsFromObject(obj, "", existingPaths);
    }
  } catch (error) {
    debugLog("YAML parsing failed, trying line-by-line parsing");
    // If YAML is invalid, try to parse line by line to get partial structure
    const lines = yamlText.split("\n");
    const pathStack = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;

      const indent = line.match(/^(\s*)/)[1].length;
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):\s*(.*)$/);

      if (keyMatch) {
        const key = keyMatch[1];
        const value = keyMatch[2].trim();

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

        // If this has a value (not just a key), it's a leaf property
        if (value && !value.startsWith("|") && !value.startsWith(">")) {
          // This is a complete property with a value
        }
      }
    }
  }

  debugLog("Extracted existing YAML paths", Array.from(existingPaths));
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
 * Get the current YAML context with improved path detection
 */
function getYamlContextAtPosition(document, position) {
  const lines = document.getText().split("\n");
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);

  debugLog("YAML Context Analysis", {
    currentLine,
    beforeCursor,
    line: position.line,
    character: position.character,
  });

  // Get current indentation
  const currentIndent = currentLine.match(/^(\s*)/)[1].length;

  // Check various typing scenarios
  const isEmptyLine = beforeCursor.trim() === "";
  const isAtStartOfLine = beforeCursor.match(/^\s*$/);
  const partialMatch = beforeCursor.match(/^\s*([a-zA-Z0-9._-]*)$/);
  const isTypingProperty = partialMatch !== null;
  const partialText = isTypingProperty ? partialMatch[1] : "";

  // Build the complete parent path by looking at the document structure
  const parentPath = buildYamlParentPath(lines, position.line, currentIndent);

  debugLog("YAML Context Result", {
    parentPath,
    currentIndent,
    isTypingProperty,
    partialText,
    isEmptyLine,
    isAtStartOfLine,
  });

  return {
    parentPath,
    currentIndent,
    isTypingProperty,
    partialText,
    isEmptyLine,
    isAtStartOfLine,
  };
}

/**
 * Build the complete parent path by analyzing the YAML structure
 */
function buildYamlParentPath(lines, currentLine, currentIndent) {
  const pathStack = [];

  // Look backwards to build the parent path
  for (let i = currentLine - 1; i >= 0; i--) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) continue;

    const lineIndent = line.match(/^(\s*)/)[1].length;
    const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):\s*(.*)$/);

    if (keyMatch && lineIndent < currentIndent) {
      const key = keyMatch[1];
      pathStack.unshift(key);
      currentIndent = lineIndent;

      if (lineIndent === 0) break;
    }
  }

  const result = pathStack.join(".");
  debugLog("Built parent path", { pathStack, result });
  return result;
}

/**
 * Find available properties that can be added as siblings - IMPROVED
 */
function findAvailableYamlProperties(
  existingPaths,
  parentPath,
  partialText = "",
) {
  debugLog("Finding available YAML properties", {
    existingPaths: Array.from(existingPaths),
    parentPath,
    partialText,
  });

  // Get all Spring Boot properties that could be children of this parent
  const allSpringProps = Object.keys(springProperties);
  let candidateProps = [];

  if (parentPath) {
    // Find properties that are children of the current parent path
    candidateProps = allSpringProps.filter((prop) => {
      return prop.startsWith(parentPath + ".") && prop !== parentPath;
    });
  } else {
    // At root level, include all properties
    candidateProps = allSpringProps;
  }

  debugLog("Candidate properties", candidateProps);

  // Group by immediate next key level
  const availableKeys = new Map();

  candidateProps.forEach((prop) => {
    let nextKey;
    if (parentPath) {
      const suffix = prop.substring(parentPath.length + 1);
      nextKey = suffix.split(".")[0];
    } else {
      nextKey = prop.split(".")[0];
    }

    // Filter by partial text if provided
    if (
      partialText &&
      !nextKey.toLowerCase().startsWith(partialText.toLowerCase())
    ) {
      return;
    }

    const fullKeyPath = parentPath ? `${parentPath}.${nextKey}` : nextKey;

    // Check if this exact path already exists
    if (existingPaths.has(fullKeyPath)) {
      return; // Skip already existing properties
    }

    if (!availableKeys.has(nextKey)) {
      const isDirectProperty = springProperties.hasOwnProperty(fullKeyPath);
      const hasChildren = candidateProps.some(
        (p) => p.startsWith(fullKeyPath + ".") && p !== fullKeyPath,
      );

      availableKeys.set(nextKey, {
        key: nextKey,
        fullPath: fullKeyPath,
        isDirectProperty,
        hasChildren,
        config: springProperties[fullKeyPath] || null,
      });
    }
  });

  const result = Array.from(availableKeys.values());
  debugLog("Available YAML properties", result);
  return result;
}

/**
 * Get Properties file context - IMPROVED
 */
function getPropertiesContextAtPosition(document, position) {
  const lines = document.getText().split("\n");
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);

  debugLog("Properties Context Analysis", {
    currentLine,
    beforeCursor,
    line: position.line,
    character: position.character,
  });

  // Check if we're in a value context (after equals sign)
  const equalsIndex = beforeCursor.indexOf("=");
  if (equalsIndex !== -1) {
    return {
      isValue: true,
      partialText: "",
      propertyName: beforeCursor.substring(0, equalsIndex).trim(),
    };
  }

  // Extract partial property name
  const match = beforeCursor.match(/([a-zA-Z0-9._-]*)$/);
  const partialText = match ? match[1] : "";

  const result = {
    isValue: false,
    partialText,
    isEmptyLine: beforeCursor.trim() === "",
    isAtStartOfLine: beforeCursor.match(/^\s*[a-zA-Z0-9._-]*$/) !== null,
  };

  debugLog("Properties Context Result", result);
  return result;
}

/**
 * Find available properties for .properties files - IMPROVED
 */
function findAvailablePropertiesFileProps(existingProps, partialText = "") {
  debugLog("Finding available Properties file props", {
    existingProps,
    partialText,
  });

  const allSpringProps = Object.keys(springProperties);

  // Filter out existing properties and match partial text
  const availableProps = allSpringProps.filter((prop) => {
    // Skip if already exists
    if (existingProps.has(prop)) {
      return false;
    }

    // Match partial text
    if (
      partialText &&
      !prop.toLowerCase().startsWith(partialText.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  debugLog("Available Properties file props", availableProps);
  return availableProps;
}

/**
 * Extract existing properties from .properties file
 */
function extractExistingPropertiesFilePaths(propertiesText) {
  const existingProps = new Set();
  const lines = propertiesText.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^([a-zA-Z0-9._-]+)\s*=/);
    if (match) {
      existingProps.add(match[1]);
    }
  }

  debugLog(
    "Extracted existing Properties file paths",
    Array.from(existingProps),
  );
  return existingProps;
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
// COMPLETION PROVIDER - COMPLETELY FIXED
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
 * Handle YAML completion - COMPLETELY REWRITTEN AND FIXED
 */
function handleYamlCompletion(document, textDocumentPosition) {
  debugLog("Handling YAML completion");

  const context = getYamlContextAtPosition(
    document,
    textDocumentPosition.position,
  );
  const existingPaths = extractExistingYamlPaths(document.getText());

  // Find available properties that can be added
  const availableProps = findAvailableYamlProperties(
    existingPaths,
    context.parentPath,
    context.partialText,
  );

  const completionItems = availableProps.map((prop) => {
    const item = CompletionItem.create(prop.key);
    item.kind = CompletionItemKind.Property;

    // Set the label and insertText correctly
    item.label = prop.key;
    item.insertText = prop.key;

    if (prop.config) {
      item.detail = `${prop.config.type}${prop.config.default !== undefined ? ` (default: ${prop.config.default})` : ""}`;
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

    // Calculate the correct text replacement range
    let replaceStartChar = context.currentIndent;
    let replaceEndChar = textDocumentPosition.position.character;

    if (context.isTypingProperty && context.partialText) {
      replaceStartChar =
        textDocumentPosition.position.character - context.partialText.length;
    }

    // Create the correct insertion text
    let insertionText = prop.key;
    if (prop.isDirectProperty && !prop.hasChildren) {
      insertionText += ": ";
    } else {
      insertionText += ":";
    }

    // Set up the text edit
    item.textEdit = {
      range: {
        start: {
          line: textDocumentPosition.position.line,
          character: replaceStartChar,
        },
        end: {
          line: textDocumentPosition.position.line,
          character: replaceEndChar,
        },
      },
      newText: insertionText,
    };

    // Sort properties before groups
    item.sortText = `${prop.isDirectProperty ? "1" : "2"}_${prop.key}`;

    return item;
  });

  debugLog("Generated YAML completion items", {
    count: completionItems.length,
    items: completionItems.map((i) => ({
      label: i.label,
      insertText: i.insertText,
    })),
  });

  return completionItems;
}

/**
 * Handle Properties file completion - COMPLETELY REWRITTEN AND FIXED
 */
function handlePropertiesCompletion(document, textDocumentPosition) {
  debugLog("Handling Properties completion");

  const context = getPropertiesContextAtPosition(
    document,
    textDocumentPosition.position,
  );

  // Don't complete values, only property names
  if (context.isValue) {
    debugLog("In value context, no completion");
    return [];
  }

  const existingProps = extractExistingPropertiesFilePaths(document.getText());
  const availableProps = findAvailablePropertiesFileProps(
    existingProps,
    context.partialText,
  );

  const completionItems = availableProps.map((propName) => {
    const config = springProperties[propName];
    const item = CompletionItem.create(propName);

    // Fix the undefined issue by setting all required fields
    item.kind = CompletionItemKind.Property;
    item.label = propName;
    item.insertText = propName;

    item.detail = `${config.type}${config.default !== undefined ? ` (default: ${config.default})` : ""}`;
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: createPropertyDocumentation(propName, config),
    };

    // Calculate the correct replacement range
    let replaceStartChar = textDocumentPosition.position.character;
    let replaceEndChar = textDocumentPosition.position.character;

    if (context.partialText) {
      replaceStartChar =
        textDocumentPosition.position.character - context.partialText.length;
    }

    // Set up the text edit with equals sign
    item.textEdit = {
      range: {
        start: {
          line: textDocumentPosition.position.line,
          character: replaceStartChar,
        },
        end: {
          line: textDocumentPosition.position.line,
          character: replaceEndChar,
        },
      },
      newText: propName + "=",
    };

    item.sortText = propName;

    return item;
  });

  debugLog("Generated Properties completion items", {
    count: completionItems.length,
    items: completionItems.map((i) => ({
      label: i.label,
      insertText: i.insertText,
    })),
  });

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
  "Spring Boot Properties LSP Server started with FIXED completion logic and proper sibling detection",
);
