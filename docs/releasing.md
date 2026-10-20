# Releasing

The `Release` GitHub Actions workflow publishes stable version tags to npm and
creates a GitHub release with the same package tarball attached. It requires the
repository secret `NPM_TOKEN` with publishing access to `llm-strings`. Use a
granular npm token with **Read and write (publish and stage)** package permission
and **Bypass two-factor authentication** enabled, so the runner can publish
without an interactive OTP. GitHub release operations use the built-in
`GITHUB_TOKEN`.

If publication fails with `ERR_PNPM_OTP_NON_INTERACTIVE`, replace `NPM_TOKEN` with
a token configured as above and rerun the workflow. See the
[npm token instructions](https://docs.npmjs.com/creating-and-viewing-access-tokens/).

1. Update `package.json` and `CHANGELOG.md`, then commit and push to `main`.
2. Create the matching version tag, such as `v1.10.0`, and push it.
3. Check the Release workflow in GitHub Actions. It verifies the version and that
   the tagged commit belongs to `main`, installs locked dependencies, runs tests
   and lint, builds, checks Node 24 and Node 20 exports, and packs the package
   before publishing. It waits up to 10 minutes for npm to make an accepted
   upload available. If this wait expires, check registry availability before
   retrying; the upload may already have succeeded.

To publish a tag that already exists, run the workflow manually from `main` and
enter the existing tag. For example:

```sh
gh workflow run release.yml --ref main -f tag=v1.10.0
```

A retry skips npm publication if the exact version already exists, then creates
or updates the GitHub release asset. Registry errors other than a missing version
fail the workflow. Existing Git tags are never moved. Prerelease version tags are
not accepted by this workflow.
