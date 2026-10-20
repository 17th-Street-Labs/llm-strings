# Releasing

The `Release` GitHub Actions workflow publishes stable version tags to npm and
creates a GitHub release with the same package tarball attached. It requires the
repository secret `NPM_TOKEN` with publishing access to `llm-strings`. GitHub
release operations use the built-in `GITHUB_TOKEN`.

1. Update `package.json` and `CHANGELOG.md`, then commit and push to `main`.
2. Create the matching version tag, such as `v1.10.0`, and push it.
3. Check the Release workflow in GitHub Actions. It verifies the version and that
   the tagged commit belongs to `main`, installs locked dependencies, runs tests
   and lint, builds, checks Node 24 and Node 20 exports, and packs the package
   before publishing.

To publish a tag that already exists, run the workflow manually from `main` and
enter the existing tag. For example:

```sh
gh workflow run release.yml --ref main -f tag=v1.10.0
```

A retry skips npm publication if the exact version already exists, then creates
or updates the GitHub release asset. Registry errors other than a missing version
fail the workflow. Existing Git tags are never moved. Prerelease version tags are
not accepted by this workflow.
