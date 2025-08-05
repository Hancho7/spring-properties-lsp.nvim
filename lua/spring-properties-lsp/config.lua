local M = {}

M.defaults = {
	auto_install = true,
	server_settings = {},
	on_attach = nil,
	install_dir = vim.fn.stdpath("data") .. "/spring-properties-lsp",
}

M.options = {}

M.setup = function(opts)
	M.options = vim.tbl_deep_extend("force", M.defaults, opts or {})
end

M.get_server_path = function()
	return M.options.install_dir .. "/server/server.js"
end

M.get_install_dir = function()
	return M.options.install_dir
end

return M
