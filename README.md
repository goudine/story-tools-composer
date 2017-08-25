# Story-tools Composer

## Deployment

### Standalone
- `npm install`
- `bower install`
- `webpack`
- `npm run server`
- `http://localhost:9090/`

## Development

### Adding Story-tools to your development environment
- Ensure that `story-tools` is a parallel directory to `story-tools-composer`.
- Rename your `story-tools` directory `time-controls` (stupid step, just until we rename story-tools in `package.json`).
- `cd story-tools-composer`
- `rm -rf node_modules/time-controls`
- Symlink your parallel `time-controls` directory to the `time-controls` directory in `story-tools-composer/node_modules`:
  - From `story-tools-composer` directory: `ln -s /absolute/path/to/time-controls node_modules/time-controls`
- After making any changes to Story-tools, run `gulp scripts` from the `story-tools` directory and they should appear in composer.

### Style
- Add less files for individual components to the component's relevant directory in `app/`.
- In order for the style to be added to the bundled stylesheet used by the application, import it into `style/style.js`.
  - Syntax example: `import styles from ../app/map/style/map.less`
- All style's are bundled into `style/bundle.css`.

### App Config
Global configuration constants are set in the `app/app.js` module constant `appConfig` object.

### Testing
`npm run test`
