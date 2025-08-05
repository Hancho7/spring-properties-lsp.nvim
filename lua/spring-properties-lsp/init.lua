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

	local server_path = config.get_server_path()

	if not vim.fn.executable("node") then
		vim.notify("Node.js is required for spring-properties-lsp", vim.log.levels.ERROR)
		return
	end

	if not vim.fn.filereadable(server_path) then
		vim.notify("Spring Properties LSP server not found. Run :SpringPropertiesInstall", vim.log.levels.WARN)
		return
	end

	local client_config = {
		name = "spring-properties-lsp",
		cmd = { "node", server_path },
		filetypes = { "yaml", "yml" },
		root_dir = util.root_pattern("application.yml", "application.yaml", ".git"),
		settings = config.options.server_settings or {},
		capabilities = vim.lsp.protocol.make_client_capabilities(),
		on_attach = function(client, bufnr)
			-- Enable completion
			vim.api.nvim_buf_set_option(bufnr, "omnifunc", "v:lua.vim.lsp.omnifunc")

			-- Set up keymaps
			local opts = { noremap = true, silent = true, buffer = bufnr }
			vim.keymap.set("n", "gd", vim.lsp.buf.definition, opts)
			vim.keymap.set("n", "K", vim.lsp.buf.hover, opts)
			vim.keymap.set("n", "<leader>ca", vim.lsp.buf.code_action, opts)

			if config.options.on_attach then
				config.options.on_attach(client, bufnr)
			end
		end,
	}

	-- Only attach to application.yml files
	vim.api.nvim_create_autocmd({ "BufEnter", "BufWinEnter" }, {
		pattern = { "application.yml", "application.yaml" },
		callback = function()
			lspconfig.spring_properties_lsp.setup(client_config)
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
