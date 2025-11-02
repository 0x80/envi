# File Format

Envi stores environment configurations in [MAML](https://maml.dev) format - a human-readable data format that explicitly guarantees key order preservation.

## Why MAML?

Envi uses MAML instead of JSON for a critical technical reason: **guaranteed key order preservation**.

Comment preservation works by storing comments as special keys that must maintain their exact position:
- `__l_00`, `__l_01`, `__l_02`... - Full-line comments and empty lines in order
- `__i_00`, `__i_01`, `__i_02`... - Inline comments adjacent to their values

If keys were reordered during serialization/deserialization, the reconstructed `.env` files would have comments in wrong positions or next to wrong values. MAML's specification explicitly guarantees key order, making it the reliable choice for this use case.

Additionally, MAML is:
- More concise than JSON (no quotes for keys)
- Human-readable and easy to edit
- Version control friendly
- Simple syntax (similar to YAML)

## Format Structure

Every stored configuration follows this structure:

```maml
{
  __envi_version: 1
  metadata: {
    updated_from: "/path/to/repository"
    updated_at: "2025-11-02T12:00:00.000Z"
  }
  files: [
    {
      path: "relative/path/to/.env"
      env: {
        # Environment variables and comments as key-value pairs
      }
    }
  ]
}
```

### Fields

- **`__envi_version`** - Format version (currently `1`)
- **`metadata.updated_from`** - Absolute path where files were captured
- **`metadata.updated_at`** - ISO timestamp of last capture
- **`files`** - Array of environment files
  - **`path`** - Relative path from repository root
  - **`env`** - Key-value pairs including environment variables and comments

## Comment Encoding

Comments are stored as special keys with incrementing numbers to preserve their order and position.

### Full-Line Comments

Full-line comments use the pattern `__l_00`, `__l_01`, `__l_02`, etc.

**Input `.env` file:**
```bash
# Database configuration
# Production settings
DATABASE_URL=postgres://localhost:5432/db

# API Keys
API_KEY=secret123
```

**Stored as MAML:**
```maml
env: {
  __l_00: "# Database configuration"
  __l_01: "# Production settings"
  DATABASE_URL: "postgres://localhost:5432/db"
  __l_02: ""
  __l_03: "# API Keys"
  API_KEY: "secret123"
}
```

Notice:
- Each comment gets an incrementing number: `__l_00`, `__l_01`, `__l_02`, `__l_03`
- Empty lines become empty string values: `__l_02: ""`
- Comments maintain their exact position relative to variables

### Inline Comments

Inline comments use the pattern `__i_00`, `__i_01`, `__i_02`, etc., and are positioned immediately before their associated variable.

**Input `.env` file:**
```bash
DATABASE_URL=postgres://localhost:5432/db  # Production database
API_KEY=secret123  # Main API key
SECRET_TOKEN=abc123  # Auth token
```

**Stored as MAML:**
```maml
env: {
  __i_00: "# Production database"
  DATABASE_URL: "postgres://localhost:5432/db"
  __i_01: "# Main API key"
  API_KEY: "secret123"
  __i_02: "# Auth token"
  SECRET_TOKEN: "abc123"
}
```

Notice:
- Each inline comment gets an incrementing number: `__i_00`, `__i_01`, `__i_02`
- Inline comments appear **before** their variable in the MAML structure
- During restoration, the comment is appended to the variable's line

### Combined Example

Here's a realistic example showing both comment types together:

**Input `.env` file:**
```bash
# Application Configuration
APP_NAME=MyApp
APP_ENV=production  # Current environment

# Database Settings
DB_HOST=localhost
DB_PORT=5432  # PostgreSQL default port
DB_NAME=myapp_db

# API Configuration
# External service credentials
API_URL=https://api.example.com
API_KEY=secret123  # Production key
```

**Stored as MAML:**
```maml
env: {
  __l_00: "# Application Configuration"
  APP_NAME: "MyApp"
  __i_00: "# Current environment"
  APP_ENV: "production"
  __l_01: ""
  __l_02: "# Database Settings"
  DB_HOST: "localhost"
  __i_01: "# PostgreSQL default port"
  DB_PORT: "5432"
  DB_NAME: "myapp_db"
  __l_03: ""
  __l_04: "# API Configuration"
  __l_05: "# External service credentials"
  API_URL: "https://api.example.com"
  __i_02: "# Production key"
  API_KEY: "secret123"
}
```

**Restored `.env` file:**
```bash
# Application Configuration
APP_NAME=MyApp
APP_ENV=production  # Current environment

# Database Settings
DB_HOST=localhost
DB_PORT=5432  # PostgreSQL default port
DB_NAME=myapp_db

# API Configuration
# External service credentials
API_URL=https://api.example.com
API_KEY=secret123  # Production key
```

Notice:
- Full-line comments: `__l_00` through `__l_05` (including empty lines)
- Inline comments: `__i_00` through `__i_02`
- Each type has its own incrementing counter
- The restored file is identical to the original

## Complete Storage Example

Here's what a complete stored configuration looks like:

```maml
{
  __envi_version: 1
  metadata: {
    updated_from: "/Users/you/projects/myapp"
    updated_at: "2025-11-02T15:30:00.000Z"
  }
  files: [
    {
      path: ".env"
      env: {
        __l_00: "# Production Environment"
        NODE_ENV: "production"
        __i_00: "# Main application port"
        PORT: "3000"
      }
    }
    {
      path: "apps/api/.env.local"
      env: {
        __l_00: "# API Configuration"
        DATABASE_URL: "postgres://localhost:5432/api_db"
        __i_00: "# Internal API secret"
        API_SECRET: "super-secret-key"
      }
    }
  ]
}
```

This example shows:
- Multiple files in a monorepo structure
- Relative paths preserved
- Comments in each file with independent numbering
- Clean, readable format for version control

## Key Order Guarantee

The critical feature of MAML is its **explicit guarantee** that object keys maintain their insertion order. This is defined in the MAML specification, unlike JSON where key order is implementation-dependent.

This guarantee ensures that when Envi:
1. Parses your `.env` file
2. Stores it as MAML
3. Reads the MAML back
4. Reconstructs the `.env` file

...the comments remain in their exact original positions, making the restored file identical to the original.

## Related

- [MAML Specification](https://maml.dev) - Official MAML documentation
- [Getting Started](/getting-started) - Basic usage guide
- [Commands](/commands/capture) - Available commands
