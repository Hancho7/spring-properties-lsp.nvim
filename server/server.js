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
  if (!prefix) {
    return Object.keys(springProperties).map((key) => ({
      property: key,
      config: springProperties[key],
    }));
  }

  return Object.keys(springProperties)
    .filter((key) => key.toLowerCase().startsWith(prefix.toLowerCase()))
    .map((key) => ({
      property: key,
      config: springProperties[key],
    }));
}

/**
 * Parse YAML document and build complete hierarchy map
 */
function parseYamlHierarchy(yamlText) {
  const hierarchy = new Map();
  const existingPaths = new Set();

  try {
    const lines = yamlText.split("\n");
    const pathStack = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
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

        // Add current key to stack
        pathStack.push({ key, indent, line: i });

        // Build full path and parent path
        const fullPath = pathStack.map((item) => item.key).join(".");
        const parentPath =
          pathStack.length > 1
            ? pathStack
                .slice(0, -1)
                .map((item) => item.key)
                .join(".")
            : "";

        existingPaths.add(fullPath);

        // Store hierarchy information
        if (!hierarchy.has(parentPath)) {
          hierarchy.set(parentPath, new Set());
        }
        hierarchy.get(parentPath).add(key);
      }
    }
  } catch (error) {
    connection.console.log(`YAML parsing error: ${error.message}`);
  }

  return { hierarchy, existingPaths };
}

/**
 * Get YAML context at cursor position with accurate parent detection
 */
function getYamlContext(document, position) {
  const lines = document.getText().split("\n");
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);

  // Get current indentation
  const currentIndent = currentLine.match(/^(\s*)/)[1].length;

  // Check what user is typing
  const isEmptyLine = beforeCursor.trim() === "";
  const partialMatch = beforeCursor.match(/^\s*([a-zA-Z0-9._-]*)$/);
  const isPartialProperty = partialMatch && partialMatch[1].length > 0;
  const partialText = isPartialProperty ? partialMatch[1] : "";

  // Find parent context by looking up the hierarchy
  let parentPath = "";
  let parentIndent = -1;

  // Look backwards to find the parent
  for (let i = position.line - 1; i >= 0; i--) {
    const line = lines[i];
    const lineIndent = line.match(/^(\s*)/)[1].length;
    const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);

    if (keyMatch && lineIndent < currentIndent) {
      const key = keyMatch[1];

      // Build the complete parent path
      const upperParentPath = getParentPathAtLine(lines, i, lineIndent);
      parentPath = upperParentPath ? `${upperParentPath}.${key}` : key;
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
    partialText,
    line: position.line,
  };
}

/**
 * Get the parent path for a given line and indentation
 */
function getParentPathAtLine(lines, lineIndex, targetIndent) {
  const pathParts = [];
  let currentIndent = targetIndent;

  for (let i = lineIndex - 1; i >= 0; i--) {
    const line = lines[i];
    const indent = line.match(/^(\s*)/)[1].length;

    if (indent < currentIndent) {
      const keyMatch = line.match(/^\s*([a-zA-Z0-9._-]+):/);
      if (keyMatch) {
        pathParts.unshift(keyMatch[1]);
        currentIndent = indent;
        if (indent === 0) break;
      }
    }
  }

  return pathParts.join(".");
}

/**
 * Find available properties that can be added as siblings
 */
function findAvailableYamlProperties(
  existingPaths,
  parentPath,
  partialText = "",
) {
  // Get all properties that could be children of the parent path
  const candidateProperties = Object.keys(springProperties).filter((prop) => {
    if (parentPath) {
      return prop.startsWith(parentPath + ".") && !existingPaths.has(prop);
    } else {
      return !existingPaths.has(prop);
    }
  });

  // Group by immediate child keys
  const childGroups = new Map();

  candidateProperties.forEach((prop) => {
    let relativeProp = prop;
    if (parentPath) {
      relativeProp = prop.substring(parentPath.length + 1);
    }

    const firstKey = relativeProp.split(".")[0];
    const fullChildPath = parentPath ? `${parentPath}.${firstKey}` : firstKey;

    // Filter by partial text if provided
    if (
      partialText &&
      !firstKey.toLowerCase().startsWith(partialText.toLowerCase())
    ) {
      return;
    }

    if (!childGroups.has(firstKey)) {
      const hasDirectProperty = springProperties.hasOwnProperty(fullChildPath);
      const hasChildren = candidateProperties.some(
        (p) => p.startsWith(fullChildPath + ".") && p !== fullChildPath,
      );

      childGroups.set(firstKey, {
        key: firstKey,
        fullPath: fullChildPath,
        hasDirectProperty,
        hasChildren,
        isLeaf: hasDirectProperty && !hasChildren,
      });
    }
  });

  return Array.from(childGroups.values());
}

/**
 * Get property being typed at cursor position for properties files
 */
function getPropertiesContext(document, position) {
  const lines = document.getText().split("\n");
  const currentLine = lines[position.line];
  const beforeCursor = currentLine.substring(0, position.character);

  // Match partial property being typed
  const match = beforeCursor.match(/([a-zA-Z0-9._-]*)$/);
  const partialText = match ? match[1] : "";

  return {
    partialText,
    isAtEquals: beforeCursor.endsWith("="),
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
// COMPLETION PROVIDER - FIXED LOGIC
// =============================================================================

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
 * Handle YAML completion with proper sibling detection
 */
function handleYamlCompletion(document, textDocumentPosition) {
  const context = getYamlContext(document, textDocumentPosition.position);
  const { hierarchy, existingPaths } = parseYamlHierarchy(document.getText());

  // Find available sibling properties
  const availableProperties = findAvailableYamlProperties(
    existingPaths,
    context.parentPath,
    context.partialText,
  );

  const completionItems = availableProperties.map((prop) => {
    const item = CompletionItem.create(prop.key);
    item.kind = CompletionItemKind.Property;

    // Get configuration
    const config = springProperties[prop.fullPath];
    if (config) {
      item.detail = `${config.type}${config.default !== undefined ? ` (default: ${config.default})` : ""}`;
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: createPropertyDocumentation(prop.fullPath, config),
      };
    } else {
      item.detail = "Configuration group";
      item.documentation = {
        kind: MarkupKind.Markdown,
        value: `**${prop.fullPath}**\n\nConfiguration group with nested properties`,
      };
    }

    // Calculate replacement range and text
    let startChar = context.currentIndent;
    let newText = prop.key;

    if (context.isPartialProperty) {
      startChar =
        textDocumentPosition.position.character - context.partialText.length;
    }

    // Add colon and space appropriately
    if (prop.isLeaf) {
      newText += ": ";
    } else {
      newText += ":";
    }

    item.textEdit = {
      range: {
        start: {
          line: textDocumentPosition.position.line,
          character: startChar,
        },
        end: textDocumentPosition.position,
      },
      newText: newText,
    };

    // Sort by relevance
    const sortPrefix = prop.isLeaf ? "1" : "2";
    item.sortText = `${sortPrefix}_${prop.key}`;

    return item;
  });

  return completionItems;
}

/**
 * Handle Properties file completion - FIXED
 */
function handlePropertiesCompletion(document, textDocumentPosition) {
  const context = getPropertiesContext(document, textDocumentPosition.position);

  // Don't provide completions after equals sign
  if (context.isAtEquals) {
    return [];
  }

  const matches = findMatchingProperties(context.partialText);

  return matches.map((match) => {
    const item = CompletionItem.create(match.property); // FIX: Use match.property instead of undefined property
    item.kind = CompletionItemKind.Property;
    item.detail = `${match.config.type}${match.config.default !== undefined ? ` (default: ${match.config.default})` : ""}`;
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: createPropertyDocumentation(match.property, match.config),
    };

    // Calculate replacement range
    const startChar =
      textDocumentPosition.position.character - context.partialText.length;

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
}

/**
 * Create rich markdown documentation for a property
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

// Hover provider - ENHANCED
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const isYaml = isYamlFile(document.uri);
  let propertyPath = "";

  if (isYaml) {
    const context = getYamlContext(document, params.position);
    const lines = document.getText().split("\n");
    const currentLine = lines[params.position.line];
    const keyMatch = currentLine.match(/^\s*([a-zA-Z0-9._-]+):/);

    if (keyMatch) {
      const key = keyMatch[1];
      propertyPath = context.parentPath ? `${context.parentPath}.${key}` : key;
    }
  } else {
    const propertiesContext = getPropertiesContext(document, params.position);
    const lines = document.getText().split("\n");
    const currentLine = lines[params.position.line];
    const match = currentLine.match(/^([a-zA-Z0-9._-]+)=/);

    if (match) {
      propertyPath = match[1];
    }
  }

  const config = springProperties[propertyPath.toLowerCase()];
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

connection.console.log(
  "Spring Boot Properties LSP Server started with enhanced YAML and Properties support",
);
