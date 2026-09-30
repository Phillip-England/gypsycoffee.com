# The Gypsy Coffee House

A public Go website with six interactive scenes. Run locally with `make run` and open <http://localhost:8804>.

Settings are read from `config/.env` and documented in `schema.json`. The app creates that file with `PORT=8804` and `SHOW_SALE_NOTICE=on` if it is missing. Set `SHOW_SALE_NOTICE=off` to remove the England Software popup and its floating reopen button. Uppr mounts `config/` at `/app/config`; the Docker image exposes 8804 and listens on `0.0.0.0`.

The public site has no admin account or database dependency. Uppr can mount `data/` at `/app/data` and create `data/main.sqlite`; the app tolerates that file. Any existing local database is preserved in `data/`, but the site does not read or write it.

Build and run with the Uppr mounts:

```sh
docker build -t gypsycoffee .
docker run --rm -p 8804:8804 \
  --mount type=bind,src="$(pwd)/config",dst=/app/config \
  --mount type=bind,src="$(pwd)/data",dst=/app/data \
  gypsycoffee
```

`make build` builds a local binary and `make test` runs the Go tests. Source images are kept in `select_images/`; only optimized assets used by the site are in `public/`. Business facts and source links are in `manifest.json`.
