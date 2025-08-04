local M = {}

function M.install(server_dir)
	vim.notify("[spring-properties-lsp] Installing server...", vim.log.levels.INFO)

	-- Clear and create directory
	vim.fn.delete(server_dir, "rf")
	vim.fn.mkdir(server_dir, "p")

	-- Get the plugin's root directory (more reliable method)
	local plugin_root = debug.getinfo(1, "S").source:sub(2):match("(.*/)") .. "../../"

	-- Files to copy from plugin to server directory
	local files = {
		"server/server.js",
		"server/package.json",
		"server/package-lock.json",
	}

	-- Copy each file
	for _, file in ipairs(files) do
		local source = plugin_root .. file
		local dest = server_dir .. "/" .. file:match("([^/]+)$")
		if vim.fn.filereadable(source) == 1 then
			vim.fn.writefile(vim.fn.readfile(source), dest)
		else
			vim.notify("Missing file: " .. source, vim.log.levels.ERROR)
			return false
		end
	end

	-- Install dependencies
	local cmd = "cd " .. vim.fn.shellescape(server_dir) .. " && npm install --silent"
	local handle = io.popen(cmd .. " 2>&1", "r")
	local result = handle:read("*a")
	handle:close()

	if vim.v.shell_error == 0 then
		vim.notify("[spring-properties-lsp] Installation successful!", vim.log.levels.INFO)
		return true
	else
		vim.notify("[spring-properties-lsp] Installation failed: " .. result, vim.log.levels.ERROR)
		return false
	end
end

return M
