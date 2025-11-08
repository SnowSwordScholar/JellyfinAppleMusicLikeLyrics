# Contributing to Jellyfin Apple Music Like Lyrics

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to this project.

## Code of Conduct

This project follows the Jellyfin community guidelines. Please be respectful and constructive in all interactions.

## Getting Started

1. **Fork the repository**
   ```bash
   # Click "Fork" on GitHub
   git clone https://github.com/YOUR_USERNAME/JellyfinAppleMusicLikeLyrics.git
   cd JellyfinAppleMusicLikeLyrics
   ```

2. **Add upstream remote**
   ```bash
   git remote add upstream https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics.git
   ```

3. **Keep your fork synced**
   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   ```

## Development Setup

### Prerequisites

- .NET 8.0 SDK
- A running Jellyfin instance (for testing)
- Git
- Code editor (VS Code, Visual Studio, Rider, etc.)

### Build from Source

```bash
# Restore dependencies
dotnet restore

# Build the project
dotnet build --configuration Debug

# Build for release
dotnet build --configuration Release
```

### Local Testing

1. Copy the built DLL to your Jellyfin plugins folder
2. Restart Jellyfin
3. Enable debug mode in plugin settings
4. Check browser console (F12) for logs

## Making Changes

### Branch Naming Convention

- `feature/` - New features (e.g., `feature/karaoke-mode`)
- `fix/` - Bug fixes (e.g., `fix/sync-issue`)
- `docs/` - Documentation updates (e.g., `docs/readme-update`)
- `refactor/` - Code refactoring (e.g., `refactor/config-service`)
- `test/` - Test additions/changes (e.g., `test/api-endpoints`)

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(lyrics): add karaoke mode support
fix(sync): correct timing offset calculation
docs(readme): update installation instructions
```

## Submitting Changes

### Pull Request Process

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write clear, self-documenting code
   - Add XML comments for public APIs
   - Update documentation if needed

3. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add your feature"
   ```

4. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

5. **Open a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your fork and branch
   - Fill in the PR template
   - Link related issues

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring
- [ ] Performance improvement

## Testing
- [ ] Tested locally
- [ ] Works with Jellyfin 10.10.0+
- [ ] Tested on Chrome/Firefox/Edge
- [ ] No console errors
- [ ] Configuration saves correctly

## Screenshots
If applicable, add screenshots

## Checklist
- [ ] Code follows project style
- [ ] Added XML comments for public APIs
- [ ] Updated README if needed
- [ ] Updated CHANGELOG.md
- [ ] No breaking changes (or documented if unavoidable)
```

## Coding Standards

### C# Code Style

- Follow [C# Coding Conventions](https://docs.microsoft.com/en-us/dotnet/csharp/fundamentals/coding-style/coding-conventions)
- Use `PascalCase` for public members
- Use `camelCase` for private fields
- Prefix private fields with underscore: `_fieldName`
- Use meaningful variable names
- Add XML documentation comments for public APIs

**Example:**
```csharp
/// <summary>
/// Gets or sets the font size for landscape mode.
/// </summary>
public int FontSizeLandscape { get; set; } = 32;

private readonly ILogger<Plugin> _logger;

private void InitializePlugin()
{
    _logger.LogInformation("Plugin initialized");
}
```

### JavaScript Code Style

- Use 2 spaces for indentation
- Use `camelCase` for variables and functions
- Use `const` for constants, `let` for variables
- Add JSDoc comments for complex functions
- Keep functions small and focused

**Example:**
```javascript
/**
 * Synchronizes lyrics with current playback time
 * @param {number} currentTime - Current playback time in milliseconds
 */
function syncLyrics(currentTime) {
  const activeLyric = lyrics.find(l => l.Start <= currentTime);
  updateActiveLyric(activeLyric);
}
```

### HTML/CSS

- Use 2 spaces for indentation
- Use semantic HTML elements
- Use BEM naming for CSS classes when applicable
- Keep CSS organized by component

## Testing

### Manual Testing Checklist

Before submitting a PR, please test:

- [ ] Plugin loads correctly in Jellyfin
- [ ] Configuration page displays properly
- [ ] Changes save and persist after restart
- [ ] Lyrics display correctly
- [ ] Animations are smooth
- [ ] Click-to-seek works
- [ ] No console errors
- [ ] Works in Chrome, Firefox, Edge
- [ ] Responsive on mobile devices

### Automated Testing

Currently, this project doesn't have automated tests. Contributions to add tests are welcome!

## Questions?

- Open an [Issue](https://github.com/SnowSwordScholar/JellyfinAppleMusicLikeLyrics/issues) for questions
- Check existing issues and PRs first
- Be patient and respectful

## License

By contributing, you agree that your contributions will be licensed under the AGPL-3.0 License.

---

Thank you for contributing! 🎉
