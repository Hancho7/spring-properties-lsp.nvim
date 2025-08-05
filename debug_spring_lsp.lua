local M = {}

-- Function to get current cursor position and context
M.get_cursor_info = function()
	local pos = vim.api.nvim_win_get_cursor(0)
	local line_num = pos[1]
	local col_num = pos[2]
	local line_content = vim.api.nvim_get_current_line()

	-- Get indentation level
	local indent_level = 0
	for i = 1, #line_content do
		if line_content:sub(i, i) == " " then
			indent_level = indent_level + 1
		else
			break
		end
	end

	-- Get YAML path context
	local yaml_path = M.get_yaml_path(line_num)

	return {
		line = line_num,
		column = col_num,
		line_content = line_content,
		indent_level = indent_level,
		yaml_path = yaml_path,
	}
end

-- Function to determine the YAML path at current position
M.get_yaml_path = function(line_num)
	local lines = vim.api.nvim_buf_get_lines(0, 0, line_num, false)
	local path = {}
	local current_indent = -1

	for i = #lines, 1, -1 do
		local line = lines[i]
		local indent = M.get_indent_level(line)
		local key = M.extract_yaml_key(line)

		if key and indent < current_indent then
			table.insert(path, 1, key)
			current_indent = indent
		elseif current_indent == -1 and key then
			table.insert(path, 1, key)
			current_indent = indent
		end
	end

	return table.concat(path, ".")
end

M.get_indent_level = function(line)
	local count = 0
	for i = 1, #line do
		if line:sub(i, i) == " " then
			count = count + 1
		else
			break
		end
	end
	return count
end

M.extract_yaml_key = function(line)
	local trimmed = line:match("^%s*(.-)%s*$")
	local key = trimmed:match("^([^:]+):")
	return key
end

-- Debug command
vim.api.nvim_create_user_command("SpringDebugCursor", function()
	local info = M.get_cursor_info()
	print("=== Spring Properties LSP Debug Info ===")
	print("Line: " .. info.line)
	print("Column: " .. info.column)
	print('Content: "' .. info.line_content .. '"')
	print("Indent Level: " .. info.indent_level)
	print("YAML Path: " .. (info.yaml_path or "root"))
end, {})

return M
