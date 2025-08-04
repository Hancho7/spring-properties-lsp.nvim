local M = {}

-- Get default capabilities with fallback
local function get_default_capabilities()
	local cmp_nvim_lsp_ok, cmp_nvim_lsp = pcall(require, "cmp_nvim_lsp")
	if cmp_nvim_lsp_ok then
		return cmp_nvim_lsp.default_capabilities()
	end

	-- Fallback to basic LSP capabilities
	return vim.lsp.protocol.make_client_capabilities()
end

M.defaults = {
	-- Server installation directory
	server_dir = vim.fn.stdpath("data") .. "/spring-properties-lsp",

	-- Auto-install server dependencies
	auto_install = true,

	-- LSP server configuration
	server = {
		capabilities = get_default_capabilities(),
		on_attach = function(client, bufnr)
			-- Default keymaps
			local bufopts = { noremap = true, silent = true, buffer = bufnr }
			vim.keymap.set("n", "K", vim.lsp.buf.hover, bufopts)
			vim.keymap.set("n", "gd", vim.lsp.buf.definition, bufopts)
			vim.keymap.set("n", "gr", vim.lsp.buf.references, bufopts)
			vim.keymap.set("n", "<space>rn", vim.lsp.buf.rename, bufopts)
			vim.keymap.set("n", "<space>ca", vim.lsp.buf.code_action, bufopts)
			vim.keymap.set("n", "<space>f", function()
				vim.lsp.buf.format({ async = true })
			end, bufopts)
		end,
		filetypes = { "properties", "yaml", "yml" },
		root_dir = function(fname)
			local lspconfig = require("lspconfig")
			return lspconfig.util.find_git_ancestor(fname) or vim.fn.getcwd()
		end,
	},

	-- File patterns to activate the LSP
	file_patterns = {
		"application*.properties",
		"application*.yml",
		"application*.yaml",
		"bootstrap*.properties",
		"bootstrap*.yml",
		"bootstrap*.yaml",
		"*.properties",
	},
}

return M
