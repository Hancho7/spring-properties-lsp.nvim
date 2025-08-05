# Spring Properties Completion for Neovim

A custom Neovim plugin that provides intelligent autocompletion for Spring Boot application.properties files.

## Features

- **Smart Property Completion**: Autocomplete Spring Boot properties with descriptions
- **Value Suggestions**: Get suggested values for common properties
- **Category Organization**: Properties organized by categories (server, datasource, jpa, etc.)
- **Template Insertion**: Quick insertion of common property templates
- **Integration**: Works seamlessly with nvim-cmp

## Installation

### Using Lazy.nvim
```lua
{
  "Hancho7/spring-properties-lsp.nvim",
  ft = "properties",  -- Only load for properties files
  dependencies = {
    "hrsh7th/nvim-cmp"
  },
  config = function()
    require("spring-properties-completion").setup()
  end
}
