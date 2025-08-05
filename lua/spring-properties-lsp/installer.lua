local M = {}
local config = require("spring-properties-lsp.config")

M.ensure_installed = function()
	local server_path = config.get_server_path()
	if not vim.fn.filereadable(server_path) then
		M.install_server()
	end
end

M.install_server = function()
	local install_dir = config.get_install_dir()

	vim.notify("Installing Spring Properties LSP server...", vim.log.levels.INFO)

	-- Create install directory
	vim.fn.mkdir(install_dir, "p")

	-- Copy server files (this would typically clone from git or download)
	-- For now, we'll create the server files directly
	M.create_server_files(install_dir)

	-- Install npm dependencies
	local server_dir = install_dir .. "/server"
	local install_cmd = string.format("cd %s && npm install", vim.fn.shellescape(server_dir))

	vim.fn.system(install_cmd)

	if vim.v.shell_error == 0 then
		vim.notify("Spring Properties LSP server installed successfully!", vim.log.levels.INFO)
	else
		vim.notify("Failed to install Spring Properties LSP server", vim.log.levels.ERROR)
	end
end

M.create_server_files = function(install_dir)
	local server_dir = install_dir .. "/server"
	vim.fn.mkdir(server_dir, "p")

	-- This is a placeholder - in a real implementation, you'd copy the actual server files
	local package_json = [[{
  "name": "spring-properties-lsp-server",
  "version": "1.0.0",
  "description": "Language Server for Spring application.yml files",
  "main": "server.js",
  "dependencies": {
    "vscode-languageserver": "^8.0.2",
    "vscode-languageserver-textdocument": "^1.0.8",
    "yaml": "^2.3.4"
  }
}]]

	vim.fn.writefile(vim.split(package_json, "\n"), server_dir .. "/package.json")
end

return M
