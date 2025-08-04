-- This file provides Vim commands for the plugin

-- Health check command
vim.api.nvim_create_user_command("SpringPropertiesLspHealth", function()
	require("spring-properties-lsp").check()
end, {
	desc = "Check Spring Properties LSP health",
})

-- Manual installation command
vim.api.nvim_create_user_command("SpringPropertiesLspInstall", function()
	local config = require("spring-properties-lsp.config")
	require("spring-properties-lsp.installer").install(config.defaults.server_dir)
end, {
	desc = "Manually install Spring Properties LSP server",
})

-- Info command
vim.api.nvim_create_user_command("SpringPropertiesLspInfo", function()
	vim.cmd("LspInfo")
end, {
	desc = "Show LSP information",
})
