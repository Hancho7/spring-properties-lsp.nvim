if vim.g.loaded_spring_properties_lsp then
	return
end
vim.g.loaded_spring_properties_lsp = 1

-- Auto-setup with default configuration
require("spring-properties-lsp").setup()
