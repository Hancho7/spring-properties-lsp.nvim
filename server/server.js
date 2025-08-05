const {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  Position,
  Range,
} = require("vscode-languageserver/node");

const { TextDocument } = require("vscode-languageserver-textdocument");
const YAML = require("yaml");

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

// Spring Boot configuration properties schema
const SPRING_PROPERTIES_SCHEMA = {
  server: {
    port: { type: "number", description: "Server HTTP port" },
    servlet: {
      "context-path": {
        type: "string",
        description: "Application context path",
      },
      session: {
        timeout: { type: "string", description: "Session timeout" },
      },
    },
    error: {
      "include-message": {
        type: "string",
        description: "Include error message in response",
        enum: ["always", "never", "on_param"],
      },
      "include-stacktrace": {
        type: "string",
        description: "Include stacktrace in response",
        enum: ["always", "never", "on_param"],
      },
    },
  },
  spring: {
    application: {
      name: { type: "string", description: "Application name" },
    },
    datasource: {
      url: { type: "string", description: "Database URL" },
      username: { type: "string", description: "Database username" },
      password: { type: "string", description: "Database password" },
      "driver-class-name": {
        type: "string",
        description: "Database driver class name",
      },
      hikari: {
        "maximum-pool-size": {
          type: "number",
          description: "Maximum pool size",
        },
        "minimum-idle": {
          type: "number",
          description: "Minimum idle connections",
        },
        "connection-timeout": {
          type: "number",
          description: "Connection timeout in milliseconds",
        },
      },
    },
    jpa: {
      hibernate: {
        "ddl-auto": {
          type: "string",
          description: "Hibernate DDL mode",
          enum: ["create", "create-drop", "update", "validate", "none"],
        },
        "show-sql": {
          type: "boolean",
          description: "Show SQL queries in logs",
        },
        "format-sql": {
          type: "boolean",
          description: "Format SQL queries in logs",
        },
      },
      "show-sql": { type: "boolean", description: "Show SQL queries" },
      "open-in-view": {
        type: "boolean",
        description: "Enable Open Session in View pattern",
      },
    },
    profiles: {
      active: { type: "string", description: "Active profiles" },
    },
    cache: {
      type: {
        type: "string",
        description: "Cache type",
        enum: ["simple", "redis", "caffeine", "ehcache"],
      },
    },
  },
  logging: {
    level: {
      com: {
        example: {
          type: "string",
          description: "Package logging level",
          enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"],
        },
      },
      org: {
        springframework: {
          type: "string",
          description: "Spring Framework logging level",
          enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"],
        },
        hibernate: {
          type: "string",
          description: "Hibernate logging level",
          enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"],
        },
      },
      root: {
        type: "string",
        description: "Root logging level",
        enum: ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"],
      },
    },
    file: {
      name: { type: "string", description: "Log file name" },
      path: { type: "string", description: "Log file path" },
    },
  },
  management: {
    endpoints: {
      web: {
        exposure: {
          include: {
            type: "string",
            description: "Exposed actuator endpoints",
          },
        },
      },
    },
    endpoint: {
      health: {
        "show-details": {
          type: "string",
          description: "Show health details",
          enum: ["always", "never", "when-authorized"],
        },
      },
    },
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
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [":"],
      },
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

// Helper function to get YAML path at position
function getYAMLPath(document, position) {
  const lines = document.getText().split("\n");
  const currentLine = position.line;
  const path = [];
  let currentIndent = -1;

  // Work backwards from current line to build the path
  for (let i = currentLine; i >= 0; i--) {
    const line = lines[i];
    const indent = getIndentLevel(line);
    const key = extractYAMLKey(line);

    if (key && (currentIndent === -1 || indent < currentIndent)) {
      path.unshift(key);
      currentIndent = indent;
    }
  }

  return path;
}

function getIndentLevel(line) {
  let count = 0;
  for (const char of line) {
    if (char === " ") {
      count++;
    } else {
      break;
    }
  }
  return count;
}

function extractYAMLKey(line) {
  const trimmed = line.trim();
  const match = trimmed.match(/^([^:]+):/);
  return match ? match[1].trim() : null;
}

// Get schema node at path
function getSchemaNode(path) {
  let current = SPRING_PROPERTIES_SCHEMA;
  for (const segment of path) {
    if (current && typeof current === "object" && current[segment]) {
      current = current[segment];
    } else {
      return null;
    }
  }
  return current;
}

// Generate completion items from schema node
function generateCompletions(schemaNode, currentPath) {
  const completions = [];

  if (!schemaNode || typeof schemaNode !== "object") {
    return completions;
  }

  for (const [key, value] of Object.entries(schemaNode)) {
    if (value && typeof value === "object") {
      const completion = {
        label: key,
        kind: value.type
          ? CompletionItemKind.Property
          : CompletionItemKind.Module,
        detail: value.description || `Configuration for ${key}`,
        documentation: value.description || `Configure ${key} properties`,
        insertText: key + ":",
      };

      // Add enum values if available
      if (value.enum) {
        completion.detail += ` (${value.enum.join(", ")})`;
      }

      // Add type information
      if (value.type) {
        completion.detail += ` [${value.type}]`;
      }

      completions.push(completion);
    }
  }

  return completions;
}

// Generate value completions for enum properties
function generateValueCompletions(schemaNode) {
  const completions = [];

  if (schemaNode && schemaNode.enum) {
    for (const value of schemaNode.enum) {
      completions.push({
        label: value,
        kind: CompletionItemKind.Value,
        detail: `Enum value: ${value}`,
        insertText: value,
      });
    }
  }

  return completions;
}

connection.onCompletion((textDocumentPosition) => {
  const document = documents.get(textDocumentPosition.textDocument.uri);
  if (!document) {
    return [];
  }

  const position = textDocumentPosition.position;
  const currentLine = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: position.character },
  });

  // Get the YAML path at current position
  const yamlPath = getYAMLPath(document, position);

  // Log debug information
  connection.console.log(
    `Completion requested at line ${position.line}, char ${position.character}`,
  );
  connection.console.log(`Current line: "${currentLine}"`);
  connection.console.log(`YAML path: [${yamlPath.join(" -> ")}]`);

  // Check if we're completing a value (after colon and space)
  if (currentLine.includes(":") && currentLine.trim().endsWith(":")) {
    // We're at the end of a key, suggest nested properties
    const schemaNode = getSchemaNode(yamlPath);
    return generateCompletions(schemaNode, yamlPath);
  } else if (currentLine.includes(": ")) {
    // We might be completing a value
    const schemaNode = getSchemaNode(yamlPath);
    if (schemaNode && schemaNode.enum) {
      return generateValueCompletions(schemaNode);
    }
  } else {
    // We're completing a key
    const parentPath = yamlPath.slice(0, -1);
    const parentNode = getSchemaNode(parentPath);
    return generateCompletions(parentNode, parentPath);
  }

  return [];
});

connection.onCompletionResolve((item) => {
  // Add additional details to completion item if needed
  return item;
});

// Make the text document manager listen on the connection
documents.listen(connection);

// Listen on the connection
connection.listen();
