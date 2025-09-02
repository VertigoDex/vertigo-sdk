# Contributing to Vertigo SDK

Thank you for your interest in contributing to the Vertigo SDK! We welcome contributions from the community and are grateful for any help you can provide.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Coding Standards](#coding-standards)
- [Documentation](#documentation)
- [Community](#community)

## 📜 Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct:

- **Be respectful**: Treat everyone with respect. No harassment, discrimination, or inappropriate behavior.
- **Be collaborative**: Work together to resolve conflicts and assume good intentions.
- **Be professional**: Keep discussions focused on improving the project.
- **Be inclusive**: Welcome newcomers and help them get started.

## 🚀 Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vertigo-sdk.git
   cd vertigo-sdk
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/vertigo-protocol/vertigo-sdk.git
   ```

## 💻 Development Setup

### Prerequisites

- Node.js v16 or higher
- Yarn package manager
- Rust (for building Solana programs)
- Solana CLI tools

### Installation

1. **Install dependencies**:
   ```bash
   yarn install
   ```

2. **Build the SDK**:
   ```bash
   yarn build
   ```

3. **Run tests to verify setup**:
   ```bash
   yarn test
   ```

### Local Development

For active development with automatic recompilation:

```bash
yarn dev
```

## 🔧 Making Changes

### Branch Naming

Use descriptive branch names:
- `feature/add-new-swap-method`
- `fix/pool-calculation-error`
- `docs/update-api-reference`
- `refactor/improve-client-structure`

### Development Workflow

1. **Create a new branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Write or update tests** for your changes

4. **Update documentation** if needed

5. **Run tests and linting**:
   ```bash
   yarn test
   yarn lint
   yarn typecheck
   ```

## 🧪 Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run tests in watch mode
yarn test:watch

# Run tests with coverage
yarn test:coverage

# Run specific test file
yarn test src/client/PoolClient.test.ts
```

### Writing Tests

- Write tests for all new functionality
- Follow existing test patterns
- Aim for high test coverage (>80%)
- Include both success and error cases
- Use descriptive test names

Example test structure:

```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should handle normal case', async () => {
      // Test implementation
    });

    it('should handle error case', async () => {
      // Test implementation
    });
  });
});
```

## 📤 Submitting Changes

### Pre-submission Checklist

- [ ] Code follows the project's coding standards
- [ ] Tests pass locally (`yarn test`)
- [ ] Linting passes (`yarn lint`)
- [ ] Type checking passes (`yarn typecheck`)
- [ ] Documentation is updated if needed
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main

### Pull Request Process

1. **Update your branch** with the latest changes from upstream:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your changes** to your fork:
   ```bash
   git push origin your-branch-name
   ```

3. **Create a Pull Request** on GitHub with:
   - Clear title describing the change
   - Description of what changed and why
   - Link to any related issues
   - Screenshots/examples if applicable

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass locally
- [ ] Added new tests for changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed code
- [ ] Updated documentation
- [ ] No new warnings
```

## 📝 Coding Standards

### TypeScript/JavaScript

```typescript
// Use arrow functions
const myFunction = () => {
  // Implementation
};

// Use const over let
const value = 10;

// Use types over interfaces
type Config = {
  apiUrl: string;
  timeout: number;
};

// Add exports at the end
export { myFunction };
```

### File Organization

```
src/
├── client/          # High-level client classes
├── core/           # Core functionality
├── api/            # API integration
├── types/          # TypeScript types
└── utils/          # Utility functions
```

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Test changes
- `chore`: Build process or auxiliary tool changes

Examples:
```bash
feat(swap): add slippage tolerance option
fix(pool): correct fee calculation
docs(readme): update installation instructions
```

## 📚 Documentation

### Code Documentation

- Add JSDoc comments for public APIs
- Include parameter descriptions
- Add usage examples for complex features

```typescript
/**
 * Executes a token swap
 * @param params - Swap parameters
 * @param params.inputMint - Input token mint address
 * @param params.outputMint - Output token mint address
 * @param params.amount - Amount to swap
 * @returns Transaction signature
 * @example
 * const signature = await swap({
 *   inputMint: SOL,
 *   outputMint: USDC,
 *   amount: 1000000000
 * });
 */
```

### Updating Documentation

- Update README.md for user-facing changes
- Update API documentation for interface changes
- Add examples for new features
- Update migration guide for breaking changes

## 🤝 Community

### Getting Help

- **Discord**: Join our [Discord server](https://discord.gg/vertigo) for discussions
- **GitHub Issues**: Search existing issues or create new ones
- **Documentation**: Check the [docs](https://docs.vertigo.so) first

### Ways to Contribute

- **Report bugs**: Open detailed bug reports with reproduction steps
- **Suggest features**: Open feature requests with use cases
- **Improve documentation**: Fix typos, clarify explanations, add examples
- **Write tests**: Increase test coverage
- **Review code**: Help review open pull requests
- **Answer questions**: Help others in Discord or GitHub discussions

## 🎯 Priority Areas

We especially welcome contributions in these areas:

- Performance optimizations
- Additional utility functions
- Integration examples
- Test coverage improvements
- Documentation improvements
- TypeScript type improvements
- Error handling enhancements

## 🏆 Recognition

Contributors will be:
- Listed in our contributors file
- Mentioned in release notes
- Given credit in the documentation

## 📋 Resources

- [Vertigo Documentation](https://docs.vertigo.so)
- [Solana Documentation](https://docs.solana.com)
- [Anchor Framework](https://www.anchor-lang.com)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## ⚖️ License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to Vertigo SDK! Your efforts help make DeFi on Solana more accessible to everyone. 🚀