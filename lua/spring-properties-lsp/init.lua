local M = {}

function M.setup(opts)
	local config = require("spring-properties-lsp.config")
	opts = vim.tbl_deep_extend("force", config.defaults, opts or {})

	-- Install server if needed
	local server_js = opts.server_dir .. "/server.js"
	if opts.auto_install and vim.fn.filereadable(server_js) == 0 then
		local installer = require("spring-properties-lsp.installer")
		local success = installer.install(opts.server_dir)
		if not success then
			vim.notify("[spring-properties-lsp] Installation failed", vim.log.levels.ERROR)
			return
		end
	end

	-- Register the LSP server configuration
	local lspconfig = require("lspconfig")
	local configs = require("lspconfig.configs")

	if not configs.spring_properties_lsp then
		configs.spring_properties_lsp = {
			default_config = {
				cmd = { "node", opts.server_dir .. "/server.js", "--stdio" },
				filetypes = { "properties" },
				root_dir = opts.server.root_dir,
				settings = {},
				single_file_support = true,
				name = "spring_properties_lsp",
			},
		}
	end

	-- Setup the server
	lspconfig.spring_properties_lsp.setup({
		capabilities = opts.server.capabilities,
		on_attach = opts.server.on_attach,
		filetypes = { "properties" },
		single_file_support = true,
	})

	-- Ensure properties files are recognized
	vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
		pattern = { "*.properties", "application*.properties", "bootstrap*.properties" },
		callback = function()
			vim.bo.filetype = "properties"
		end,
	})

	vim.notify("[spring-properties-lsp] Setup complete", vim.log.levels.INFO)
end

return M
