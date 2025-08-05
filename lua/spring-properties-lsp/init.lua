local M = {}
local config = require("spring-properties-lsp.config")
local installer = require("spring-properties-lsp.installer")

M.setup = function(opts)
	config.setup(opts)

	-- Auto-install server if not present
	if config.options.auto_install then
		installer.ensure_installed()
	end

	-- Start LSP client
	M.start_client()
end

M.start_client = function()
	local lspconfig = require("lspconfig")
	local util = require("lspconfig.util")
	local lsp = vim.lsp

	local server_path = config.get_server_path()

	if not vim.fn.executable("node") then
		vim.notify("Node.js is required for spring-properties-lsp", vim.log.levels.ERROR)
		return
	end

	if not vim.fn.filereadable(server_path) then
		vim.notify("Spring Properties LSP server not found. Run :SpringPropertiesInstall", vim.log.levels.WARN)
		return
	end

	-- Register custom LSP server configuration
	local configs = require("lspconfig.configs")

	if not configs.spring_properties_lsp then
		configs.spring_properties_lsp = {
			default_config = {
				cmd = { "node", server_path },
				filetypes = { "yaml", "yml" },
				root_dir = util.root_pattern("application.yml", "application.yaml", ".git"),
				settings = {},
				single_file_support = true,
			},
			docs = {
				description = "Language server for Spring Boot application.yml files",
			},
		}
	end

	-- Setup the LSP server
	lspconfig.spring_properties_lsp.setup({
		settings = config.options.server_settings or {},
		capabilities = lsp.protocol.make_client_capabilities(),
		on_attach = function(client, bufnr)
			-- Only attach to application.yml files
			local filename = vim.api.nvim_buf_get_name(bufnr)
			if not (filename:match("application%.ya?ml$")) then
				return
			end
			-- Your on_attach logic here
		end,
	})
end

-- Command to manually install/update server
vim.api.nvim_create_user_command("SpringPropertiesInstall", function()
	installer.install_server()
end, {})

-- Command to get cursor position info (for debugging)
vim.api.nvim_create_user_command("SpringPropertiesDebug", function()
	local pos = vim.api.nvim_win_get_cursor(0)
	local line = vim.api.nvim_get_current_line()
	print(string.format("Position: line %d, col %d", pos[1], pos[2]))
	print(string.format('Line content: "%s"', line))
end, {})

return M
