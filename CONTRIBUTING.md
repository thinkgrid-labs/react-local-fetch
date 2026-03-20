# Contributing to @thinkgrid/react-local-fetch

First off, thank you for considering contributing to `@thinkgrid/react-local-fetch`! It's people like you that make it a great tool for the community.

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v22 or higher)
- [npm](https://www.npmjs.com/)

### Setup

1. Fork and Clone the repository:
   ```bash
   git clone https://github.com/your-username/react-local-fetch.git
   cd react-local-fetch
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the core package:
   ```bash
   npm run build
   ```

## 🛠️ Development Workflow

### Running Tests

We use [Vitest](https://vitest.dev/) for testing. Make sure all tests pass before submitting a PR:
```bash
npm test
```

### Building the Package

We use [tsup](https://tsup.egoist.dev/) for bundling:
```bash
npm run build
```

### Trying out the Examples

We have example apps in the `examples/` directory. They use the local build of the library.

**Next.js Example:**
```bash
cd examples/nextjs-example
npm install
npm run dev
```

**Vite Example:**
```bash
cd examples/vite-example
npm install
npm run dev
```

## 🤝 Pull Request Process

1. Create a new branch for your feature or bug fix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Commit your changes with descriptive messages.
3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
4. Open a Pull Request against the `dev` branch.

## 📄 Code of Conduct

Please be respectful and professional in all interactions.

## 📝 License

By contributing, you agree that your contributions will be licensed under the MIT License.
