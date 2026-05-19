# log-parser

## Resources
- https://svelte.dev/docs/kit/introduction
  - Official docs for SvelteKit specifically, like nextjs.org
- https://svelte.dev/docs/svelte/overview
  - Official docs for Svelte, like react.dev
- https://www.svelteexamples.com/
  - Example projects to read through for better understanding structure.
- https://www.sitepoint.com/a-beginners-guide-to-sveltekit/
  - All the different svelte concepts put together to make a site.
- https://svelte.dev/playground/hello-world?show=input
  - Small examples available under the hamburger menu icon in the top left.
- https://sveltebyexample.com/
  - My personal favourite for svelte examples.

> Most AIs are able to help you with Svelte but make sure to specify you're using **Svelte 5**. Most AIs I've worked with default to Svelte 4, which has had a lot of breaking changes in Svelte 5.

## Creating a project

If you're seeing this, you've probably already done this step. Congrats!

```sh
# create a new project
npx sv create my-app
```

To recreate this project with the same configuration:

```sh
# recreate this project
npx sv@0.15.3 create --template minimal --types ts --add prettier eslint tailwindcss="plugins:typography,forms" sveltekit-adapter="adapter:node" --install npm .
```

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```sh
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```sh
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
