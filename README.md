# spring-properties-lsp.nvim

A Neovim plugin that provides Language Server Protocol (LSP) support for Spring Boot application.properties and application.yml files with intelligent autocompletion, hover documentation, and validation.

## Features

- 🚀 **Smart Autocomplete**: Intelligent property suggestions for Spring Boot configurations
- 📖 **Hover Documentation**: Detailed property descriptions with types and default values
- ✅ **Validation**: Real-time YAML syntax validation
- 🎯 **Multi-format Support**: Works with both `.properties` and `.yml/.yaml` files
- 🛠️ **Easy Setup**: Automatic server installation and configuration

## Requirements

- Neovim >= 0.8.0
- Node.js >= 16.0.0
- nvim-lspconfig
- A completion plugin (recommended: nvim-cmp)

## Installation

### Using [lazy.nvim](https://github.com/folke/lazy.nvim)

```lua

## Using lazy.vim
{
  "Hancho7/spring-properties-lsp.nvim",
  dependencies = {
    "neovim/nvim-lspconfig",
    "hrsh7th/cmp-nvim-lsp", -- Optional: for enhanced completion
  },
  ft = { "properties", "yaml", "yml" },
  opts = {
    -- Configuration options (see below)
  },
}

## Using packer.nvim
use {
  "Hancho7/spring-properties-lsp.nvim",
  requires = {
    "neovim/nvim-lspconfig",
    "hrsh7th/cmp-nvim-lsp", -- Optional
  },
  ft = { "properties", "yaml", "yml" },
  config = function()
    require("spring-properties-lsp").setup()
  end,
}

## Using vim-plug
Plug 'neovim/nvim-lspconfig'
Plug 'Hancho7/spring-properties-lsp.nvim'

" In your init.lua or after/plugin/spring-properties-lsp.lua:
lua require("spring-properties-lsp").setup()
