# NPM

[more info](https://zellwk.com/blog/publish-to-npm/)

## how to publish

```ruby
npm install npm@latest -g
npm login
npm init --scope=volcanicminds
npm publish --access public
```

A prerelease (`0.5.0-alpha.0`) goes on `next`, never on `latest`: npm refuses to publish one
without a tag, and `latest` must keep pointing at the line that speaks to the backend on `latest`.

```ruby
npm publish --access public --tag next
```

## local linking

```ruby
npm link
npm link "@volcanicminds/admin"
```

```ruby
npm unlink
npm unlink "@volcanicminds/admin"
```
