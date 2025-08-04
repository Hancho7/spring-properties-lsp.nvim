-- Debug script for Spring Properties LSP
-- Save this as debug_spring_lsp.lua and run with :luafile debug_spring_lsp.lua

local function debug_lsp()
	print("=== Spring Properties LSP Debug ===")

	-- Check if the LSP client is attached
	local clients = vim.lsp.get_active_clients()
	local spring_client = nil

	for _, client in ipairs(clients) do
		if client.name == "spring_properties_lsp" then
			spring_client = client
			break
		end
	end

	if spring_client then
		print("✓ Spring Properties LSP client is active")
		print("  Client ID: " .. spring_client.id)
		print("  Server capabilities:")
		print("    - Completion: " .. tostring(spring_client.server_capabilities.completionProvider ~= nil))
		print("    - Hover: " .. tostring(spring_client.server_capabilities.hoverProvider))

		-- Check attached buffers
		local attached_buffers = {}
		for _, buf in ipairs(vim.api.nvim_list_bufs()) do
			if vim.lsp.buf_is_attached(buf, spring_client.id) then
				table.insert(attached_buffers, buf)
			end
		end

		print("  Attached buffers: " .. #attached_buffers)
		for _, buf in ipairs(attached_buffers) do
			local buf_name = vim.api.nvim_buf_get_name(buf)
			local filetype = vim.api.nvim_buf_get_option(buf, "filetype")
			print("    - Buffer " .. buf .. ": " .. buf_name .. " (filetype: " .. filetype .. ")")
		end
	else
		print("✗ Spring Properties LSP client is NOT active")

		-- Check if the server file exists
		local server_path = vim.fn.stdpath("data") .. "/spring-properties-lsp/server.js"
		if vim.fn.filereadable(server_path) == 1 then
			print("✓ Server file exists: " .. server_path)
		else
			print("✗ Server file missing: " .. server_path)
		end
	end

	-- Check current buffer
	local current_buf = vim.api.nvim_get_current_buf()
	local buf_name = vim.api.nvim_buf_get_name(current_buf)
	local filetype = vim.api.nvim_buf_get_option(current_buf, "filetype")

	print("\nCurrent buffer info:")
	print("  Buffer: " .. current_buf)
	print("  Name: " .. buf_name)
	print("  Filetype: " .. filetype)
	print("  Is properties file: " .. tostring(buf_name:match("%.properties$") ~= nil))

	-- Check completion sources
	local cmp_ok, cmp = pcall(require, "cmp")
	if cmp_ok then
		print("\n✓ nvim-cmp is available")
		local sources = cmp.get_config().sources
		if sources then
			print("  Completion sources:")
			for i, source_group in ipairs(sources) do
				print("    Group " .. i .. ":")
				for j, source in ipairs(source_group) do
					print("      - " .. source.name)
				end
			end
		end
	else
		print("\n✗ nvim-cmp is not available")
	end

	print("\n=== End Debug ===")
end

-- Run the debug
debug_lsp()

-- Also set up a test command
vim.api.nvim_create_user_command("SpringLSPDebug", debug_lsp, {})

-- Test completion function
local function test_completion()
	local params = vim.lsp.util.make_position_params()
	local client = vim.lsp.get_active_clients({ name = "spring_properties_lsp" })[1]

	if not client then
		print("No Spring Properties LSP client found")
		return
	end

	print("Testing completion at current position...")
	client.request("textDocument/completion", params, function(err, result, ctx, config)
		if err then
			print("Completion error: " .. vim.inspect(err))
		elseif result then
			print("Completion result:")
			for i, item in ipairs(result.items or result) do
				print(string.format("  %d. label='%s' insertText='%s'", i, item.label, item.insertText or "nil"))
			end
		else
			print("No completion result")
		end
	end, current_buf)
end

vim.api.nvim_create_user_command("SpringLSPTestCompletion", test_completion, {})
