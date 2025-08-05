-- plugin/spring-properties-lsp.lua
-- This file is automatically loaded when Neovim starts

if vim.g.loaded_spring_properties_lsp then
	return
end
vim.g.loaded_spring_properties_lsp = 1

-- Debug message to confirm plugin is loading
print("[SpringPropertiesLSP] Plugin loaded")

-- Ensure properties files are detected correctly
vim.api.nvim_create_autocmd({ "BufRead", "BufNewFile" }, {
	pattern = { "*.properties", "application*.properties", "application*.yml", "application*.yaml" },
	callback = function()
		vim.bo.filetype = "properties"
	end,
})

-- Initialize when cmp is available
vim.api.nvim_create_autocmd("User", {
	pattern = "LazyDone",
	callback = function()
		-- Small delay to ensure all plugins are loaded
		vim.defer_fn(function()
			local ok, spring_lsp = pcall(require, "spring-properties-lsp")
			if ok then
				spring_lsp.setup()
			else
				print("[SpringPropertiesLSP] Failed to load: " .. spring_lsp)
			end
		end, 100)
	end,
})
