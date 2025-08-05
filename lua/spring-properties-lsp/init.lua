-- lua/spring-properties-completion/init.lua
local M = {}

-- Spring Boot properties database with descriptions
local spring_properties = {
	-- Server Configuration
	["server.port"] = { desc = "Server HTTP port", default = "8080", category = "server" },
	["server.servlet.context-path"] = { desc = "Context path of the application", default = "/", category = "server" },
	["server.address"] = { desc = "Network address to which the server should bind", default = "", category = "server" },
	["server.ssl.enabled"] = { desc = "Whether to enable SSL support", default = "false", category = "server" },
	["server.ssl.key-store"] = {
		desc = "Path to the key store that holds the SSL certificate",
		default = "",
		category = "server",
	},
	["server.ssl.key-store-password"] = {
		desc = "Password used to access the key store",
		default = "",
		category = "server",
	},
	["server.compression.enabled"] = {
		desc = "Whether response compression is enabled",
		default = "false",
		category = "server",
	},
	["server.http2.enabled"] = { desc = "Whether to enable HTTP/2 support", default = "false", category = "server" },

	-- Database Configuration
	["spring.datasource.url"] = { desc = "JDBC URL of the database", default = "", category = "datasource" },
	["spring.datasource.username"] = { desc = "Login username of the database", default = "", category = "datasource" },
	["spring.datasource.password"] = { desc = "Login password of the database", default = "", category = "datasource" },
	["spring.datasource.driver-class-name"] = {
		desc = "Fully qualified name of the JDBC driver",
		default = "",
		category = "datasource",
	},
	["spring.datasource.hikari.maximum-pool-size"] = {
		desc = "Maximum size that the pool is allowed to reach",
		default = "10",
		category = "datasource",
	},
	["spring.datasource.hikari.minimum-idle"] = {
		desc = "Minimum number of idle connections in the pool",
		default = "10",
		category = "datasource",
	},
	["spring.datasource.hikari.connection-timeout"] = {
		desc = "Maximum time to wait for a connection from the pool",
		default = "30000",
		category = "datasource",
	},

	-- JPA Configuration
	["spring.jpa.hibernate.ddl-auto"] = {
		desc = "DDL mode (none, validate, update, create, create-drop)",
		default = "none",
		category = "jpa",
	},
	["spring.jpa.show-sql"] = {
		desc = "Whether to enable logging of SQL statements",
		default = "false",
		category = "jpa",
	},
	["spring.jpa.properties.hibernate.dialect"] = { desc = "SQL dialect to use", default = "", category = "jpa" },
	["spring.jpa.properties.hibernate.format_sql"] = {
		desc = "Whether to format SQL in logs",
		default = "false",
		category = "jpa",
	},
	["spring.jpa.database-platform"] = {
		desc = "Name of the target database to operate on",
		default = "",
		category = "jpa",
	},
	["spring.jpa.generate-ddl"] = {
		desc = "Whether to initialize the schema on startup",
		default = "false",
		category = "jpa",
	},

	-- Logging Configuration
	["logging.level.com.yourpackage"] = { desc = "Log level for your package", default = "INFO", category = "logging" },
	["logging.level.org.springframework"] = {
		desc = "Log level for Spring Framework",
		default = "INFO",
		category = "logging",
	},
	["logging.level.org.hibernate"] = { desc = "Log level for Hibernate", default = "INFO", category = "logging" },
	["logging.level.org.hibernate.SQL"] = {
		desc = "Log level for Hibernate SQL",
		default = "INFO",
		category = "logging",
	},
	["logging.level.org.hibernate.type.descriptor.sql.BasicBinder"] = {
		desc = "Log level for Hibernate SQL parameters",
		default = "INFO",
		category = "logging",
	},
	["logging.file.name"] = { desc = "Log file name", default = "", category = "logging" },
	["logging.file.path"] = { desc = "Log file path", default = "", category = "logging" },
	["logging.pattern.console"] = {
		desc = "Appender pattern for output to the console",
		default = "",
		category = "logging",
	},
	["logging.pattern.file"] = { desc = "Appender pattern for output to a file", default = "", category = "logging" },

	-- Application Configuration
	["spring.application.name"] = { desc = "Application name", default = "", category = "application" },
	["spring.profiles.active"] = {
		desc = "Comma-separated list of active profiles",
		default = "",
		category = "application",
	},
	["spring.config.import"] = { desc = "Import additional config data", default = "", category = "application" },

	-- Security Configuration
	["spring.security.user.name"] = { desc = "Default user name", default = "user", category = "security" },
	["spring.security.user.password"] = {
		desc = "Password for the default user name",
		default = "",
		category = "security",
	},
	["spring.security.user.roles"] = {
		desc = "Granted roles for the default user name",
		default = "",
		category = "security",
	},

	-- Actuator Configuration
	["management.endpoints.web.exposure.include"] = {
		desc = "Endpoint IDs that should be included or '*' for all",
		default = "health,info",
		category = "actuator",
	},
	["management.endpoint.health.show-details"] = {
		desc = "When to show full health details",
		default = "never",
		category = "actuator",
	},
	["management.endpoints.web.base-path"] = {
		desc = "Base path for Web endpoints",
		default = "/actuator",
		category = "actuator",
	},

	-- Mail Configuration
	["spring.mail.host"] = { desc = "SMTP server host", default = "", category = "mail" },
	["spring.mail.port"] = { desc = "SMTP server port", default = "587", category = "mail" },
	["spring.mail.username"] = { desc = "Login user of the SMTP server", default = "", category = "mail" },
	["spring.mail.password"] = { desc = "Login password of the SMTP server", default = "", category = "mail" },
	["spring.mail.properties.mail.smtp.auth"] = {
		desc = "Whether to enable SMTP authentication",
		default = "true",
		category = "mail",
	},
	["spring.mail.properties.mail.smtp.starttls.enable"] = {
		desc = "Whether to enable STARTTLS",
		default = "true",
		category = "mail",
	},

	-- Redis Configuration
	["spring.redis.host"] = { desc = "Redis server host", default = "localhost", category = "redis" },
	["spring.redis.port"] = { desc = "Redis server port", default = "6379", category = "redis" },
	["spring.redis.password"] = { desc = "Login password of the redis server", default = "", category = "redis" },
	["spring.redis.database"] = {
		desc = "Database index used by the connection factory",
		default = "0",
		category = "redis",
	},

	-- Cache Configuration
	["spring.cache.type"] = { desc = "Cache type", default = "simple", category = "cache" },
	["spring.cache.cache-names"] = {
		desc = "Comma-separated list of cache names to create",
		default = "",
		category = "cache",
	},

	-- Jackson Configuration
	["spring.jackson.serialization.write-dates-as-timestamps"] = {
		desc = "Whether to write dates as timestamps",
		default = "true",
		category = "jackson",
	},
	["spring.jackson.serialization.indent-output"] = {
		desc = "Whether to indent JSON output",
		default = "false",
		category = "jackson",
	},
	["spring.jackson.deserialization.fail-on-unknown-properties"] = {
		desc = "Whether to fail when encountering unknown properties",
		default = "true",
		category = "jackson",
	},

	-- Thymeleaf Configuration
	["spring.thymeleaf.cache"] = {
		desc = "Whether to enable template caching",
		default = "true",
		category = "thymeleaf",
	},
	["spring.thymeleaf.prefix"] = {
		desc = "Prefix that gets prepended to view names",
		default = "classpath:/templates/",
		category = "thymeleaf",
	},
	["spring.thymeleaf.suffix"] = {
		desc = "Suffix that gets appended to view names",
		default = ".html",
		category = "thymeleaf",
	},
}

-- Common values for specific properties
local property_values = {
	["spring.jpa.hibernate.ddl-auto"] = { "none", "validate", "update", "create", "create-drop" },
	["logging.level.com.yourpackage"] = { "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF" },
	["logging.level.org.springframework"] = { "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF" },
	["logging.level.org.hibernate"] = { "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF" },
	["logging.level.org.hibernate.SQL"] = { "TRACE", "DEBUG", "INFO", "WARN", "ERROR", "FATAL", "OFF" },
	["spring.profiles.active"] = { "dev", "test", "prod", "local" },
	["spring.cache.type"] = { "simple", "redis", "caffeine", "ehcache", "hazelcast", "infinispan", "jcache", "none" },
	["management.endpoint.health.show-details"] = { "never", "when-authorized", "always" },
	["spring.jackson.serialization.write-dates-as-timestamps"] = { "true", "false" },
	["spring.jackson.serialization.indent-output"] = { "true", "false" },
	["spring.jackson.deserialization.fail-on-unknown-properties"] = { "true", "false" },
	["server.ssl.enabled"] = { "true", "false" },
	["server.compression.enabled"] = { "true", "false" },
	["server.http2.enabled"] = { "true", "false" },
	["spring.jpa.show-sql"] = { "true", "false" },
	["spring.jpa.properties.hibernate.format_sql"] = { "true", "false" },
	["spring.jpa.generate-ddl"] = { "true", "false" },
	["spring.thymeleaf.cache"] = { "true", "false" },
	["spring.mail.properties.mail.smtp.auth"] = { "true", "false" },
	["spring.mail.properties.mail.smtp.starttls.enable"] = { "true", "false" },
}

-- Setup function
function M.setup(opts)
	opts = opts or {}

	-- Create autocommand for properties files
	vim.api.nvim_create_autocmd("FileType", {
		pattern = "properties",
		callback = function(event)
			M.setup_completion(event.buf)
		end,
	})

	-- Also trigger for existing properties buffers
	for _, buf in ipairs(vim.api.nvim_list_bufs()) do
		if vim.bo[buf].filetype == "properties" then
			M.setup_completion(buf)
		end
	end
end

-- Setup completion for a specific buffer
function M.setup_completion(bufnr)
	local cmp = require("cmp")

	-- Register custom source
	cmp.register_source("spring_properties", M.new_source())

	-- Override cmp config for this buffer
	cmp.setup.buffer({
		sources = cmp.config.sources({
			{ name = "spring_properties", priority = 1000 },
			{ name = "nvim_lsp" },
			{ name = "luasnip" },
			{ name = "buffer" },
			{ name = "path" },
		}),
	})
end

-- Create new completion source
function M.new_source()
	local source = {}

	function source:get_trigger_characters()
		return { ".", "=" }
	end

	function source:is_available()
		return vim.bo.filetype == "properties"
	end

	function source:complete(request, callback)
		local line = request.context.cursor_line
		local col = request.context.cursor.col

		local before_cursor = line:sub(1, col - 1)
		local items = {}

		-- Check if we're completing a property name or value
		local eq_pos = before_cursor:find("=")

		if eq_pos then
			-- We're completing a value
			local prop_name = before_cursor:sub(1, eq_pos - 1):match("^%s*(.-)%s*$")
			if property_values[prop_name] then
				for _, value in ipairs(property_values[prop_name]) do
					table.insert(items, {
						label = value,
						kind = vim.lsp.protocol.CompletionItemKind.Value,
						detail = "Suggested value",
						documentation = "Common value for " .. prop_name,
					})
				end
			end
		else
			-- We're completing a property name
			local partial = before_cursor:match("([^%s]*)$") or ""

			for prop, info in pairs(spring_properties) do
				if prop:lower():find(partial:lower(), 1, true) then
					local insert_text = prop
					if info.default and info.default ~= "" then
						insert_text = prop .. "=" .. info.default
					else
						insert_text = prop .. "="
					end

					table.insert(items, {
						label = prop,
						kind = vim.lsp.protocol.CompletionItemKind.Property,
						detail = "[" .. info.category .. "] " .. info.desc,
						documentation = {
							kind = "markdown",
							value = string.format(
								"**%s**\n\n%s\n\n*Category:* %s\n*Default:* `%s`",
								prop,
								info.desc,
								info.category,
								info.default
							),
						},
						insertText = insert_text,
						filterText = prop,
						sortText = string.format(
							"%02d_%s",
							info.category == "application" and 1
								or info.category == "server" and 2
								or info.category == "datasource" and 3
								or info.category == "jpa" and 4
								or 99,
							prop
						),
					})
				end
			end
		end

		callback({ items = items })
	end

	return source
end

-- Commands for inserting property templates
function M.create_commands()
	vim.api.nvim_create_user_command("SpringProperties", function()
		M.show_property_menu()
	end, { desc = "Show Spring Boot properties menu" })

	vim.api.nvim_create_user_command("SpringDatasource", function()
		M.insert_datasource_template()
	end, { desc = "Insert datasource configuration template" })

	vim.api.nvim_create_user_command("SpringServer", function()
		M.insert_server_template()
	end, { desc = "Insert server configuration template" })
end

-- Show property selection menu
function M.show_property_menu()
	local categories = {}
	for _, info in pairs(spring_properties) do
		if not categories[info.category] then
			categories[info.category] = {}
		end
		table.insert(categories[info.category], info)
	end

	vim.ui.select(vim.tbl_keys(categories), {
		prompt = "Select property category:",
	}, function(choice)
		if choice then
			M.show_category_properties(choice, categories[choice])
		end
	end)
end

-- Show properties for a specific category
function M.show_category_properties(category, properties)
	local prop_names = {}
	for prop, _ in pairs(spring_properties) do
		if spring_properties[prop].category == category then
			table.insert(prop_names, prop)
		end
	end

	vim.ui.select(prop_names, {
		prompt = "Select " .. category .. " property:",
		format_item = function(prop)
			return prop .. " - " .. spring_properties[prop].desc
		end,
	}, function(choice)
		if choice then
			M.insert_property(choice)
		end
	end)
end

-- Insert a property with its default value
function M.insert_property(prop)
	local info = spring_properties[prop]
	local line = prop .. "=" .. (info.default or "")

	local row = vim.api.nvim_win_get_cursor(0)[1]
	vim.api.nvim_buf_set_lines(0, row, row, false, { line })

	-- Position cursor at the end of the line
	vim.api.nvim_win_set_cursor(0, { row + 1, #line })
end

-- Insert datasource template
function M.insert_datasource_template()
	local template = {
		"# Database Configuration",
		"spring.datasource.url=jdbc:mysql://localhost:3306/your_database",
		"spring.datasource.username=your_username",
		"spring.datasource.password=your_password",
		"spring.datasource.driver-class-name=com.mysql.cj.jdbc.Driver",
		"",
		"# Connection Pool Settings",
		"spring.datasource.hikari.maximum-pool-size=20",
		"spring.datasource.hikari.minimum-idle=5",
		"spring.datasource.hikari.connection-timeout=30000",
		"",
	}

	local row = vim.api.nvim_win_get_cursor(0)[1]
	vim.api.nvim_buf_set_lines(0, row, row, false, template)
end

-- Insert server template
function M.insert_server_template()
	local template = {
		"# Server Configuration",
		"server.port=8080",
		"server.servlet.context-path=/",
		"server.compression.enabled=true",
		"",
	}

	local row = vim.api.nvim_win_get_cursor(0)[1]
	vim.api.nvim_buf_set_lines(0, row, row, false, template)
end

-- Initialize the plugin
function M.init()
	M.create_commands()
end

return M
