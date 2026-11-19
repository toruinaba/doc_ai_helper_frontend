# Frontend Migration Guide: Repository Path Structure Changes

## Overview
We've improved the repository path structure to clearly separate concerns between repository organization and document navigation.

## Field Changes

### Old Structure (Still Supported)
```typescript
interface Repository {
  root_path?: string;  // Mixed concept: main document file path
}
```

### New Structure
```typescript
interface Repository {
  // Navigation
  root_document_path?: string;      // Main document file (e.g., "docs/README.md")
  
  // Link Resolution  
  document_root_directory?: string; // Document base directory (e.g., "docs")
  repository_root: string;          // Repository base (default: "/")
  
  // Legacy (deprecated but maintained)
  root_path?: string;              // Use root_document_path instead
}
```

## Migration Strategy

### Phase 1: Immediate (No Changes Required)
- All existing code continues to work
- `root_path` field remains functional
- No frontend changes needed

### Phase 2: Gradual Adoption
```typescript
// Repository selection
const jumpToDocument = (repo: Repository) => {
  // New method (preferred)
  const mainDoc = repo.root_document_path || repo.root_path;
  navigateTo(mainDoc);
};

// Link resolution
const resolveRelativeLink = (repo: Repository, currentDoc: string, relativeLink: string) => {
  // New method (preferred)  
  const baseDir = repo.document_root_directory || 
                  (repo.root_path ? path.dirname(repo.root_path) : path.dirname(currentDoc));
  return resolveLink(baseDir, currentDoc, relativeLink);
};
```

### Phase 3: Full Migration
```typescript
// Clean implementation using new fields only
const jumpToDocument = (repo: Repository) => {
  navigateTo(repo.root_document_path);
};

const resolveRelativeLink = (repo: Repository, currentDoc: string, relativeLink: string) => {
  const baseDir = repo.document_root_directory || path.dirname(currentDoc);
  return resolveLink(baseDir, currentDoc, relativeLink);
};
```

## Key Benefits

1. **Clear Separation**: Navigation vs. link resolution concerns
2. **Flexibility**: Support for complex repository structures
3. **Backward Compatibility**: Zero breaking changes
4. **Future-Proof**: Extensible for multiple document roots

## Timeline
- **Now**: New fields available in API responses
- **Optional**: Migrate at your own pace
- **Future**: `root_path` will be removed (with advance notice)

## Questions?
The new structure maintains full compatibility while providing clearer semantics for document management.