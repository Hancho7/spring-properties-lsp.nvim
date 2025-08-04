---

# Spring application.yml/properties LSP for Neovim

Provides intelligent completion, hover documentation, and validation for Spring Boot configuration files (`application.properties`/`application.yml`).

## Features

- ✅ **Smart completions** for Spring Boot properties
- 📝 **Documentation on hover** with type info and defaults
- 🛠 **YAML/properties formatting**
- ⚡ **Fast setup** with auto-installation
- 🌿 **Spring profile-aware** suggestions

## Installation

### Requirements
- Neovim ≥ 0.9.0
- Node.js ≥ 16.x
- `nvim-lspconfig` (installed automatically)

### Using [Lazy.nvim](https://github.com/folke/lazy.nvim)
```lua
{
  "Hancho7/spring-properties-lsp.nvim",
  dependencies = {
    "neovim/nvim-lspconfig",
    "hrsh7th/cmp-nvim-lsp" -- Optional: for completions
  },
  ft = { "properties", "yaml", "yml" }, -- Lazy-load on filetype
  opts = {
    -- See configuration options below
  }
}
```

### Using [Packer.nvim](https://github.com/wbthomason/packer.nvim)
```lua
use {
  "Hancho7/spring-properties-lsp.nvim",
  requires = {
    "neovim/nvim-lspconfig",
    "hrsh7th/cmp-nvim-lsp" -- Optional
  },
  config = function()
    require("spring-properties-lsp").setup()
  end
}
```

## Configuration
Default settings (you don't need to specify these unless overriding):
```lua
require("spring-properties-lsp").setup({
  auto_install = true,      -- Auto-install server on startup
  server_dir = vim.fn.stdpath("data") .. "/spring-properties-lsp", -- Install location
  capabilities = require("cmp_nvim_lsp").default_capabilities(), -- Completions
  on_attach = function(client, bufnr)
    -- Default keymaps:
    vim.keymap.set("n", "K", vim.lsp.buf.hover, { buffer = bufnr })
    vim.keymap.set("n", "<leader>cf", vim.lsp.buf.format, { buffer = bufnr })
    -- Add your custom keymaps here
  end
})
```

## Commands
| Command                     | Description                          |
|-----------------------------|--------------------------------------|
| `:SpringPropertiesLspInstall` | Manually install/update the LSP server |
| `:SpringPropertiesLspHealth` | Verify installation health           |


---
