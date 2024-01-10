
# REHUMAN flow testing

## Tools and Technologies Used

- JavaScript/ES6+ for scripting
- Webpack for bundling JavaScript modules
- Babel for transpiling ES6+ JavaScript code to backward-compatible versions
- npm for managing package dependencies
- jsPsych library for creating behavioral experiments in a web browser
- Firebase for hosting and database services

## Installation

Follow these steps to set up and run the project locally.

### Prerequisites

- Node.js (preferably the latest stable version)
- npm (comes with Node.js)
- Git for version control

### Clone the Repository

To clone the project repository, run the following command:

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd path-to-your-project
```

Replace `<YOUR_GITHUB_REPOSITORY_URL>` with the actual URL of the GitHub repository.

### Install Dependencies

Navigate to the project directory and install the dependencies with npm:

```bash
npm install
```

### Run the Application

#### Development Mode

Start the application in development mode with hot-reloading:

```bash
npm start
```

This command will start the webpack-dev-server, typically accessible at `http://localhost:3000`.

#### Production Build

Create an optimized production build with:

```bash
npm run build
```

Webpack will generate the `dist` folder containing the production-ready files.

## Deployment

To deploy the application to Firebase Hosting:

1. Install the Firebase CLI and log in using `firebase login`.
2. Run the following command to deploy:

```bash
firebase deploy
```

## Contributing

If you'd like to contribute to the project, please fork the repository and use a feature branch. Pull requests are warmly welcome.

## License

This project is licensed under the [MIT License](LICENSE.md) - see the LICENSE.md file for details.
