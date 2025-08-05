-- plugin/spring-properties.lua
-- This file automatically loads when Neovim starts

if vim.g.loaded_spring_properties_completion then
	return
end
vim.g.loaded_spring_properties_completion = 1

-- Initialize the plugin
require("spring-properties-completion").init()
