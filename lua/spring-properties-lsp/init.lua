local M = {}

function M.setup(opts)
	local config = require("spring-properties-lsp.config")
	opts = vim.tbl_deep_extend("force", config.defaults, opts or {})

	-- Register the LSP server configuration FIRST
	local lspconfig = require("lspconfig")
	local configs = require("lspconfig.configs")

	if not configs.spring_properties_lsp then
		configs.spring_properties_lsp = {
			default_config = {
				cmd = { "node", opts.server_dir .. "/server.js", "--stdio" },
				filetypes = opts.server.filetypes,
				root_dir = opts.server.root_dir,
				settings = {},
				single_file_support = true,
			},
		}
	end

	-- Then setup the server
	lspconfig.spring_properties_lsp.setup({
		capabilities = opts.server.capabilities,
		on_attach = opts.server.on_attach,
	})
end

return M
