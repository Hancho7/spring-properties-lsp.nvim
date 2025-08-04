#!/usr/bin/env node

const {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  CompletionItemKind,
  MarkupKind,
  InsertTextFormat,
} = require("vscode-languageserver/node");
const { TextDocument } = require("vscode-languageserver-textdocument");

// Create LSP connection
const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

// Spring Boot Properties Database
const SPRING_PROPERTIES = {
  "server.port": "Server HTTP port (default: 8080)",
  "server.address": "Network address to bind the server",
  "server.servlet.context-path": "Context path of the application",
  "server.ssl.enabled": "Enable SSL support (true/false)",
  "server.ssl.key-store": "Path to the SSL key store",
  "server.ssl.key-store-password": "Password for the SSL key store",

  "spring.application.name": "Name of the application",
  "spring.profiles.active": "Active Spring profiles (comma-separated)",

  "spring.datasource.url": "JDBC URL for the database connection",
  "spring.datasource.username": "Database username",
  "spring.datasource.password": "Database password",
  "spring.datasource.driver-class-name": "JDBC driver class name",
  "spring.datasource.hikari.maximum-pool-size":
    "Maximum number of connections in pool",
  "spring.datasource.hikari.minimum-idle": "Minimum idle connections in pool",
  "spring.datasource.hikari.connection-timeout":
    "Connection timeout in milliseconds",

  "spring.jpa.hibernate.ddl-auto":
    "Hibernate DDL mode (create, update, validate, none)",
  "spring.jpa.show-sql": "Show SQL statements in logs (true/false)",
  "spring.jpa.properties.hibernate.dialect": "Hibernate SQL dialect",
  "spring.jpa.properties.hibernate.format_sql":
    "Format SQL in logs (true/false)",

  "logging.level.sql": "SQL logging level",
  "logging.level.org.hibernate.SQL": "Hibernate SQL logging level",
  "logging.level.org.hibernate.type.descriptor.sql.BasicBinder":
    "Hibernate parameter logging",
  "logging.file.name": "Name of the log file",
  "logging.file.path": "Path where log files are stored",
  "logging.pattern.console": "Console logging pattern",
  "logging.pattern.file": "File logging pattern",
};

function log(message) {
  connection.console.log(
    `[SpringPropertiesLSP] ${new Date().toISOString()} - ${message}`,
  );
}

function isPropertiesFile(uri) {
  return uri.toLowerCase().endsWith(".properties");
}

class PropertiesAnalyzer {
  constructor(document) {
    this.document = document;
    this.text = document.getText();
    this.lines = this.text.split("\n");
  }

  // Get the property key being typed at cursor position
  getPropertyKeyAtPosition(position) {
    const line = this.lines[position.line] || "";
    const textBeforeCursor = line.substring(0, position.character);

    log(`Analyzing line: "${line}"`);
    log(`Text before cursor: "${textBeforeCursor}"`);

    // If line contains '=', get everything before it
    if (textBeforeCursor.includes("=")) {
      const key = textBeforeCursor.split("=")[0].trim();
      log(`Found key before equals: "${key}"`);
      return key;
    }

    // Otherwise, return the text before cursor (trimmed)
    const key = textBeforeCursor.trim();
    log(`Found key: "${key}"`);
    return key;
  }

  // Get all existing property keys in the file
  getExistingKeys() {
    const existingKeys = new Set();

    for (const line of this.lines) {
      const trimmedLine = line.trim();
      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith("#")) {
        continue;
      }

      // Extract key from key=value pairs
      if (trimmedLine.includes("=")) {
        const key = trimmedLine.split("=")[0].trim();
        if (key) {
          existingKeys.add(key);
        }
      }
    }

    log(`Existing keys: ${Array.from(existingKeys).join(", ")}`);
    return existingKeys;
  }
}

// Initialize LSP server
connection.onInitialize((params) => {
  log("Initializing Spring Properties LSP Server");
  log(
    `Client capabilities: ${JSON.stringify(params.capabilities.textDocument?.completion, null, 2)}`,
  );

  return {
    capabilities: {
      textDocumentSync: {
        openClose: true,
        change: 1, // Full document sync
      },
      completionProvider: {
        triggerCharacters: [".", "="],
        resolveProvider: false,
      },
      hoverProvider: true,
    },
    serverInfo: {
      name: "Spring Properties LSP",
      version: "1.0.0",
    },
  };
});

// Handle completion requests
connection.onCompletion((params) => {
  try {
    log(`=== COMPLETION REQUEST ===`);
    log(`URI: ${params.textDocument.uri}`);
    log(
      `Position: line=${params.position.line}, character=${params.position.character}`,
    );

    const document = documents.get(params.textDocument.uri);
    if (!document) {
      log("ERROR: Document not found");
      return [];
    }

    if (!isPropertiesFile(params.textDocument.uri)) {
      log("Not a properties file, skipping");
      return [];
    }

    const analyzer = new PropertiesAnalyzer(document);
    const currentKey = analyzer.getPropertyKeyAtPosition(params.position);
    const existingKeys = analyzer.getExistingKeys();

    log(`Current key being typed: "${currentKey}"`);

    const completionItems = [];

    // Find matching properties
    for (const [propertyKey, description] of Object.entries(
      SPRING_PROPERTIES,
    )) {
      // Skip if this property already exists
      if (existingKeys.has(propertyKey)) {
        log(`Skipping existing property: ${propertyKey}`);
        continue;
      }

      // Check if property matches current typing
      if (propertyKey.toLowerCase().startsWith(currentKey.toLowerCase())) {
        log(`Creating completion item for: ${propertyKey}`);

        // Create completion item with explicit values for all fields
        const completionItem = {
          label: propertyKey,
          kind: CompletionItemKind.Property,
          detail: "Spring Boot Property",
          documentation: description,
          insertText: propertyKey + "=",
          insertTextFormat: InsertTextFormat.PlainText,
          sortText: `0000${propertyKey}`, // Ensure consistent sorting
          filterText: propertyKey,
          textEdit: undefined, // Don't use textEdit, rely on insertText
          additionalTextEdits: undefined,
          commitCharacters: undefined,
          command: undefined,
          data: undefined,
        };

        completionItems.push(completionItem);
      }
    }

    log(`=== COMPLETION RESULT ===`);
    log(`Found ${completionItems.length} completion items`);
    for (const item of completionItems) {
      log(`  - ${item.label} -> "${item.insertText}"`);
    }
    log(`=========================`);

    return completionItems;
  } catch (error) {
    log(`ERROR in completion: ${error.message}`);
    log(`Stack trace: ${error.stack}`);
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

    log(`Hover requested for: "${propertyKey}"`);

    // Check if we have documentation for this property
    const description = SPRING_PROPERTIES[propertyKey];
    if (description) {
      return {
        contents: {
          kind: MarkupKind.Markdown,
          value: `**${propertyKey}**\n\n${description}`,
        },
      };
    }

    return null;
  } catch (error) {
    log(`ERROR in hover: ${error.message}`);
    return null;
  }
});

connection.onInitialized(() => {
  log("Spring Properties LSP Server initialized successfully");
});

// Document event handlers
documents.onDidOpen((event) => {
  log(`Document opened: ${event.document.uri}`);
});

documents.onDidClose((event) => {
  log(`Document closed: ${event.document.uri}`);
});

documents.onDidChangeContent((change) => {
  log(`Document changed: ${change.document.uri}`);
});

// Error handling
process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});

process.on("uncaughtException", (error) => {
  log(`UNCAUGHT EXCEPTION: ${error.message}`);
  log(`Stack: ${error.stack}`);
  process.exit(1);
});

// Start the server
documents.listen(connection);
connection.listen();

log("Spring Properties LSP Server started and listening...");
