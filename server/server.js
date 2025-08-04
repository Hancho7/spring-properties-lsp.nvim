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
        triggerCharacters: [".", ":", "=", "-"],
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

// Helper functions
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

function getPropertyAtPosition(document, position) {
  const text = document.getText();
  const lines = text.split("\n");
  const line = lines[position.line];

  if (isYamlFile(document.uri)) {
    // For YAML files, get the current property path context
    const currentPath = getYamlPropertyPath(
      lines,
      position.line,
      position.character,
    );

    // Handle the case where we're completing after a ":"
    const beforeCursor = line.substring(0, position.character);
    if (beforeCursor.trim().endsWith(":")) {
      return currentPath; // Return full path so we can complete children
    }

    // Otherwise get the partial property being typed
    const match = beforeCursor.match(/([a-zA-Z0-9._-]+)$/);
    return match ? match[1] : "";
  } else {
    // Original properties file handling
    const beforeCursor = line.substring(0, position.character);
    const match = beforeCursor.match(/([a-zA-Z0-9._-]+)$/);
    return match ? match[1] : "";
  }
}
function getYamlPropertyPath(lines, lineIndex, character) {
  const currentLine = lines[lineIndex];
  const beforeCursor = currentLine.substring(0, character);

  // Get current indentation level
  const currentIndent = currentLine.match(/^(\s*)/)[1].length;

  // Build path by going up the hierarchy
  const path = [];

  // Extract current key if we're on a key line
  const keyMatch = beforeCursor.match(/([a-zA-Z0-9._-]+)$/);
  if (keyMatch) {
    path.unshift(keyMatch[1]);
  } else {
    // Extract key from current line
    const lineKeyMatch = currentLine.match(/^\s*([a-zA-Z0-9._-]+):/);
    if (lineKeyMatch) {
      path.unshift(lineKeyMatch[1]);
    }
  }

  // Go up the hierarchy
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

  return path.join(".");
}

function findMatchingProperties(prefix) {
  return Object.keys(springProperties)
    .filter((key) => key.startsWith(prefix.toLowerCase()))
    .map((key) => ({
      property: key,
      config: springProperties[key],
    }));
}

// Completion provider
connection.onCompletion((textDocumentPosition) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    return [];
  }

  const property = getPropertyAtPosition(
    document,
    textDocumentPosition.position,
  );
  const matches = findMatchingProperties(property);
  const isYaml = isYamlFile(document.uri);

  return matches.map((match) => {
    const item = CompletionItem.create(match.property);
    item.kind = CompletionItemKind.Property;
    item.detail = match.config.type;
    item.documentation = {
      kind: MarkupKind.Markdown,
      value: `**${match.property}**\n\n${match.config.description}\n\n**Type:** ${match.config.type}${match.config.default !== undefined ? `\n\n**Default:** \`${match.config.default}\`` : ""}${match.config.enum ? `\n\n**Valid values:** ${match.config.enum.map((v) => `\`${v}\``).join(", ")}` : ""}`,
    };

    if (isYaml) {
      // For YAML files, convert dot notation to proper YAML structure
      const yamlPath = convertToYamlPath(match.property);
      item.insertText = yamlPath;

      // Calculate the proper range for replacement
      const line = document.getText().split("\n")[
        textDocumentPosition.position.line
      ];
      const beforeCursor = line.substring(
        0,
        textDocumentPosition.position.character,
      );

      // Handle different completion scenarios
      if (beforeCursor.trim().endsWith(":")) {
        // Case: "spring:" -> should become proper YAML structure
        item.textEdit = {
          range: {
            start: { line: textDocumentPosition.position.line, character: 0 },
            end: textDocumentPosition.position,
          },
          newText: yamlPath,
        };
      } else {
        // Default case - replace just the property part
        const match = beforeCursor.match(/([\w.]*)$/);
        if (match) {
          item.textEdit = {
            range: {
              start: {
                line: textDocumentPosition.position.line,
                character:
                  textDocumentPosition.position.character - match[1].length,
              },
              end: textDocumentPosition.position,
            },
            newText: yamlPath,
          };
        }
      }
    } else {
      // Original properties file handling
      const line = document.getText().split("\n")[
        textDocumentPosition.position.line
      ];
      const beforeCursor = line.substring(
        0,
        textDocumentPosition.position.character,
      );
      const match = beforeCursor.match(/([a-zA-Z0-9._-]*)$/);
      if (match) {
        item.textEdit = {
          range: {
            start: {
              line: textDocumentPosition.position.line,
              character:
                textDocumentPosition.position.character - match[1].length,
            },
            end: textDocumentPosition.position,
          },
          newText: match.property + "=",
        };
      }
    }

    return item;
  });
});

// Helper function to convert dot notation to YAML path
function convertToYamlPath(property) {
  const parts = property.split(".");
  let yamlPath = "";
  let indent = 0;

  for (let i = 0; i < parts.length; i++) {
    yamlPath += " ".repeat(indent) + parts[i] + ":";
    if (i < parts.length - 1) {
      yamlPath += "\n";
      indent += 2;
    }
  }

  return yamlPath;
}
// Completion resolve
connection.onCompletionResolve((item) => {
  return item;
});

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
        value: `**${property}**\n\n${config.description}\n\n**Type:** ${config.type}${config.default !== undefined ? `\n\n**Default:** \`${config.default}\`` : ""}${config.enum ? `\n\n**Valid values:** ${config.enum.map((v) => `\`${v}\``).join(", ")}` : ""}`,
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

connection.console.log("Spring Boot Properties LSP Server started");
